use serde::{Deserialize, Serialize};
use std::{
    ffi::OsString,
    fs::{self, OpenOptions},
    io::{BufRead, BufReader, Write},
    net::{TcpListener, TcpStream},
    os::windows::ffi::OsStrExt,
    sync::mpsc,
    thread,
    time::Duration,
};
use windows_service::{
    define_windows_service,
    service::{
        ServiceControl, ServiceControlAccept, ServiceExitCode, ServiceState, ServiceStatus,
        ServiceType,
    },
    service_control_handler::{self, ServiceControlHandlerResult},
    service_dispatcher,
};
use windows_sys::Win32::{
    Foundation::{GetLastError, HANDLE},
    Graphics::Gdi::{CreateDCW, DeleteDC, TextOutW},
    Graphics::Printing::{ClosePrinter, GetPrinterW, OpenPrinterW, PRINTER_INFO_5W},
    Storage::Xps::{EndDoc, EndPage, StartDocW, StartPage, DOCINFOW},
};

const SERVICE_NAME: &str = "CODEXSUNQCafePrint";
const SERVICE_ADDRESS: &str = "127.0.0.1:4181";
const MAX_RECEIPT_BYTES: usize = 16 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct PrintRequest {
    printer_name: String,
    document_name: String,
    receipt: String,
}

#[derive(Serialize)]
struct PrintResponse {
    ok: bool,
    job_id: Option<u32>,
    message: String,
}

define_windows_service!(ffi_service_main, service_main);

fn main() -> windows_service::Result<()> {
    if std::env::args().any(|argument| argument == "--self-test") {
        return run_self_test();
    }
    service_dispatcher::start(SERVICE_NAME, ffi_service_main)
}

fn run_self_test() -> windows_service::Result<()> {
    let lines = printable_lines("Q Cafe printer service test\n\nBill 1");
    if lines != ["Q Cafe printer service test", "", "Bill 1"] {
        return Err(windows_service::Error::Winapi(std::io::Error::other(
            "Print layout is invalid.",
        )));
    }
    println!("Q Cafe Windows print service self-test passed.");
    Ok(())
}

fn service_main(_: Vec<OsString>) {
    let (shutdown_sender, shutdown_receiver) = mpsc::channel();
    let status_handle =
        match service_control_handler::register(SERVICE_NAME, move |event| match event {
            ServiceControl::Stop | ServiceControl::Shutdown => {
                let _ = shutdown_sender.send(());
                ServiceControlHandlerResult::NoError
            }
            _ => ServiceControlHandlerResult::NotImplemented,
        }) {
            Ok(handle) => handle,
            Err(_) => return,
        };

    let running = ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Running,
        controls_accepted: ServiceControlAccept::STOP | ServiceControlAccept::SHUTDOWN,
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    };
    if status_handle.set_service_status(running).is_err() {
        return;
    }

    if let Ok(listener) = TcpListener::bind(SERVICE_ADDRESS) {
        let _ = listener.set_nonblocking(true);
        while shutdown_receiver.try_recv().is_err() {
            match listener.accept() {
                Ok((stream, _)) => {
                    let _ = handle_connection(stream);
                }
                Err(error) if error.kind() == std::io::ErrorKind::WouldBlock => {
                    thread::sleep(Duration::from_millis(100))
                }
                Err(_) => thread::sleep(Duration::from_millis(250)),
            }
        }
    }

    let _ = status_handle.set_service_status(ServiceStatus {
        service_type: ServiceType::OWN_PROCESS,
        current_state: ServiceState::Stopped,
        controls_accepted: ServiceControlAccept::empty(),
        exit_code: ServiceExitCode::Win32(0),
        checkpoint: 0,
        wait_hint: Duration::default(),
        process_id: None,
    });
}

fn handle_connection(mut stream: TcpStream) -> std::io::Result<()> {
    stream.set_nonblocking(false)?;
    service_log("Received a print-service connection.");
    let request = read_request(&stream);
    let response = match request {
        Ok(request) => {
            service_log(&format!(
                "Submitting '{}' to '{}'.",
                request.document_name, request.printer_name
            ));
            match print_receipt_to_spooler(&request) {
                Ok(job_id) => PrintResponse {
                    ok: true,
                    job_id: Some(job_id),
                    message: "Receipt submitted to the selected Windows printer queue.".to_string(),
                },
                Err(message) => PrintResponse {
                    ok: false,
                    job_id: None,
                    message,
                },
            }
        }
        Err(message) => PrintResponse {
            ok: false,
            job_id: None,
            message,
        },
    };
    let json = serde_json::to_string(&response).expect("print response serializes");
    stream.write_all(json.as_bytes())?;
    stream.write_all(b"\n")
}

fn read_request(stream: &TcpStream) -> Result<PrintRequest, String> {
    let mut line = String::new();
    service_log("Reading the print request payload.");
    BufReader::new(stream)
        .read_line(&mut line)
        .map_err(|_| "Q Cafe print service could not read the receipt.".to_string())?;
    service_log(&format!("Read {} request bytes.", line.len()));
    if line.len() > MAX_RECEIPT_BYTES * 2 {
        return Err("The receipt is too large to print.".to_string());
    }
    let request = serde_json::from_str::<PrintRequest>(&line)
        .map_err(|_| "Q Cafe print service received an invalid receipt.".to_string())?;
    service_log("Parsed the print request payload.");
    if request.printer_name.trim().is_empty()
        || request.document_name.trim().is_empty()
        || request.receipt.trim().is_empty()
    {
        return Err("The printer, document name, and receipt are required.".to_string());
    }
    if request.receipt.as_bytes().len() > MAX_RECEIPT_BYTES {
        return Err("The receipt is too large to print.".to_string());
    }
    Ok(request)
}

fn print_receipt_to_spooler(request: &PrintRequest) -> Result<u32, String> {
    if printer_requires_file_prompt(&request.printer_name)? {
        return Err(
            "This Windows printer requires a file-save dialog. Select a printer that prints without a file prompt before using direct print."
                .to_string(),
        );
    }
    let printer_name = wide(&request.printer_name);
    let document_name = wide(&request.document_name);
    let driver_name = wide("WINSPOOL");
    unsafe {
        service_log("Creating the Windows printer device context.");
        let device_context = CreateDCW(
            driver_name.as_ptr(),
            printer_name.as_ptr(),
            std::ptr::null(),
            std::ptr::null(),
        );
        if device_context.is_null() {
            service_log("Windows did not create the printer device context.");
            return Err(last_error(
                "Q Cafe could not connect to the selected Windows printer",
            ));
        }
        let document = DOCINFOW {
            cbSize: std::mem::size_of::<DOCINFOW>() as i32,
            lpszDocName: document_name.as_ptr(),
            lpszOutput: std::ptr::null(),
            lpszDatatype: std::ptr::null(),
            fwType: 0,
        };
        service_log("Starting the Windows spooler document.");
        let job_id = StartDocW(device_context, &document);
        if job_id <= 0 {
            DeleteDC(device_context);
            return Err(last_error("Q Cafe could not start the Windows print job"));
        }
        service_log(&format!("Windows spooler created job {job_id}."));
        if StartPage(device_context) <= 0 {
            EndDoc(device_context);
            DeleteDC(device_context);
            return Err(last_error("Q Cafe could not start the receipt page"));
        }
        let mut y = 120;
        for line in printable_lines(&request.receipt) {
            let text = wide(&line);
            if TextOutW(
                device_context,
                100,
                y,
                text.as_ptr(),
                line.encode_utf16().count() as i32,
            ) == 0
            {
                EndPage(device_context);
                EndDoc(device_context);
                DeleteDC(device_context);
                return Err(last_error(
                    "Q Cafe could not render the receipt to the printer queue",
                ));
            }
            y += 44;
        }
        if EndPage(device_context) <= 0 || EndDoc(device_context) <= 0 {
            DeleteDC(device_context);
            return Err(last_error("Q Cafe could not finish the Windows print job"));
        }
        DeleteDC(device_context);
        Ok(job_id as u32)
    }
}

fn printer_requires_file_prompt(printer_name: &str) -> Result<bool, String> {
    let printer_name_wide = wide(printer_name);
    unsafe {
        let mut printer: HANDLE = std::ptr::null_mut();
        if OpenPrinterW(printer_name_wide.as_ptr(), &mut printer, std::ptr::null()) == 0 {
            return Err(last_error(
                "Q Cafe could not open the selected Windows printer",
            ));
        }
        let result = (|| {
            let mut needed = 0;
            GetPrinterW(printer, 5, std::ptr::null_mut(), 0, &mut needed);
            if needed == 0 {
                return Err(last_error(
                    "Q Cafe could not read the selected Windows printer",
                ));
            }
            let mut buffer = vec![0_u8; needed as usize];
            if GetPrinterW(printer, 5, buffer.as_mut_ptr(), needed, &mut needed) == 0 {
                return Err(last_error(
                    "Q Cafe could not read the selected Windows printer",
                ));
            }
            let info = &*(buffer.as_ptr() as *const PRINTER_INFO_5W);
            Ok(wide_pointer_to_string(info.pPortName).contains("PORTPROMPT"))
        })();
        ClosePrinter(printer);
        result
    }
}

fn service_log(message: &str) {
    let program_data = std::env::var_os("ProgramData")
        .map(std::path::PathBuf::from)
        .unwrap_or_else(|| std::path::PathBuf::from(r"C:\ProgramData"));
    let directory = program_data.join("Q Cafe").join("logs");
    if fs::create_dir_all(&directory).is_err() {
        return;
    }
    let path = directory.join("print-service.log");
    if let Ok(mut log) = OpenOptions::new().create(true).append(true).open(path) {
        let _ = writeln!(
            log,
            "{} {message}",
            chrono::Local::now().format("%Y-%m-%d %H:%M:%S")
        );
    }
}

fn printable_lines(receipt: &str) -> Vec<String> {
    receipt
        .replace('\r', "")
        .lines()
        .map(str::to_owned)
        .collect()
}

fn wide(value: &str) -> Vec<u16> {
    OsString::from(value).encode_wide().chain(Some(0)).collect()
}

fn wide_pointer_to_string(pointer: *mut u16) -> String {
    if pointer.is_null() {
        return String::new();
    }
    unsafe {
        let length = (0..32_768)
            .find(|index| *pointer.add(*index) == 0)
            .unwrap_or(0);
        String::from_utf16_lossy(std::slice::from_raw_parts(pointer, length))
    }
}

fn last_error(prefix: &str) -> String {
    format!("{prefix}. Windows error {}.", unsafe { GetLastError() })
}

#[cfg(test)]
mod tests {
    use super::{printable_lines, PrintRequest};

    #[test]
    fn receipt_lines_preserve_blank_line_spacing() {
        assert_eq!(
            printable_lines("Bill 1\r\n\r\nTotal"),
            ["Bill 1", "", "Total"]
        );
    }

    #[test]
    fn print_request_uses_the_desktop_camel_case_contract() {
        let request = serde_json::from_str::<PrintRequest>(
            r#"{"printerName":"Thermal","documentName":"Bill 1","receipt":"Total Rs.10"}"#,
        )
        .expect("desktop print request parses");
        assert_eq!(request.printer_name, "Thermal");
        assert_eq!(request.document_name, "Bill 1");
    }
}
