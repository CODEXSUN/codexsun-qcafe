export type LiveImageFolderStatus = {
  ok: boolean;
  folderPath: string;
  canWrite: boolean;
  message: string;
};

export async function verifyLiveImageFolder(folderPath: string, writeProtected: boolean): Promise<LiveImageFolderStatus> {
  if (!('__TAURI_INTERNALS__' in window)) {
    return {
      ok: false,
      folderPath,
      canWrite: false,
      message: 'Open Q Cafe for Windows to check this folder on the computer.',
    };
  }
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<LiveImageFolderStatus>('qcafe_verify_image_folder', { folderPath, writeProtected });
}

export async function openLiveImageFolder(folderPath: string): Promise<void> {
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('qcafe_open_image_folder', { folderPath });
}

export async function installDemoImages(folderPath: string, writeProtected: boolean) {
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<{ count: number; folderPath: string }>('qcafe_install_demo_images', { folderPath, writeProtected });
}

export async function storeItemImage(folderPath: string, itemCode: string, imageData: string, writeProtected: boolean) {
  if (!('__TAURI_INTERNALS__' in window) || !imageData.startsWith('data:image/')) return null;
  const { invoke } = await import('@tauri-apps/api/core');
  return invoke<string>('qcafe_store_item_image', { folderPath, itemCode, imageData, writeProtected });
}
