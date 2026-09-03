import { useState } from "react";
import type { ModuleManifest } from "@codexsun/contracts";
import { TopologyMarker, type InterfaceTopologyController } from "@codexsun/devkit-ito";
import { normalizeTags, startupFeatures, type StartupPreferences } from "./startup-preferences";
import "./startup-settings.css";

type Props = { applications: ModuleManifest[]; preferences: StartupPreferences; onChange: (next: StartupPreferences) => void; topology: InterfaceTopologyController };

export function StartupSettings({ applications, preferences, onChange, topology }: Props) {
  return <div className="startup-controls ito-region" {...topology.regionProps("13")}>
    <TopologyMarker id="13" topology={topology} />
    <p className="startup-description">Choose how the CODEXSUN OS desk opens. Changes apply on your next reload and are saved in this browser.</p>
    {applications.length > 0 && <section className="settings-group"><h2>Applications</h2><p>Enabled applications open in workspace tabs. Their services must already be running.</p>
      {applications.map((app) => <div className="setting-row" key={app.id}><div><strong>{app.name}</strong><p>{app.description}</p><Tags tags={preferences.tags[app.id] ?? []} /></div><PreferenceSwitch label={`Start ${app.name}`} checked={preferences.applications[app.id] === true} onChange={() => onChange({ ...preferences, applications: { ...preferences.applications, [app.id]: !preferences.applications[app.id] } })} /></div>)}
    </section>}
    <section className="settings-group"><h2>Workspace features</h2>{startupFeatures.map((feature) => <div className="setting-row" key={feature.id}><div><strong>{feature.name}</strong><p>{feature.detail}</p></div><PreferenceSwitch label={feature.name} checked={preferences.features[feature.id]} onChange={() => onChange({ ...preferences, features: { ...preferences.features, [feature.id]: !preferences.features[feature.id] } })} /></div>)}</section>
    <section className="settings-group"><h2>Runtime requirements</h2><div className="setting-row"><div><strong>API, web and startup preflight</strong><p>Managed by the development launcher. Port checks and execution isolation remain required.</p></div><span className="setting-value">Required</span></div></section>
  </div>;
}

export function IotSettings({ applications, preferences, onChange, topology }: Props) {
  const [filter, setFilter] = useState("");
  const apps = applications.filter((app) => `${app.name} ${(preferences.tags[app.id] ?? []).join(" ")}`.toLowerCase().includes(filter.toLowerCase()));
  return <section className="settings-group ito-region" {...topology.regionProps("14")}>
    <TopologyMarker id="14" topology={topology} /><h2>IoT</h2>
    <div className="setting-row"><div><strong>IoT control panel</strong><p>Enable centralized app tagging and IoT configuration in this browser.</p></div><PreferenceSwitch label="IoT control panel" checked={preferences.iotEnabled} onChange={() => onChange({ ...preferences, iotEnabled: !preferences.iotEnabled })} /></div>
    {preferences.iotEnabled ? <div className="iot-panel"><p>Tag apps with IoT capabilities such as iot, sensors, telemetry or automation. Tags describe your configuration; device connections and commands need an application provider.</p>
      <label className="iot-search">Find apps or tags<input value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Search apps or capability tags" /></label>
      {apps.map((app) => <AppTags key={app.id} name={app.name} tags={preferences.tags[app.id] ?? []} onSave={(tags) => onChange({ ...preferences, tags: { ...preferences.tags, [app.id]: tags } })} />)}
      {!applications.length && <p>No external application desks are enabled. IoT remains available for future OS integrations.</p>}
      {applications.length > 0 && !apps.length && <p>No apps match this search.</p>}
    </div> : <p className="startup-description">IoT configuration is off. Saved tags are retained.</p>}
  </section>;
}

function AppTags({ name, tags, onSave }: { name: string; tags: string[]; onSave: (tags: string[]) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return <div className="iot-app"><div className="setting-row"><div><strong>{name}</strong><Tags tags={tags} />{!tags.length && <p>No capabilities tagged</p>}</div><button className="setting-button" onClick={() => { setDraft(tags.join(", ")); setEditing(!editing); }}>{editing ? "Cancel" : "Configure tags"}</button></div>
    {editing && <form className="iot-tag-form" onSubmit={(event) => { event.preventDefault(); onSave(normalizeTags(draft)); setEditing(false); }}><label>Capability tags for {name}<input maxLength={500} placeholder="iot, sensors, telemetry" value={draft} onChange={(event) => setDraft(event.target.value)} /></label><small>Comma-separated, up to 12 tags. Clear the field to remove all tags.</small><button className="setting-button" type="submit">Save tags</button></form>}
  </div>;
}

export function PreferenceSwitch({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return <button type="button" aria-checked={checked} aria-label={label} className={checked ? "setting-switch checked" : "setting-switch"} onClick={onChange} role="switch"><span /></button>;
}

function Tags({ tags }: { tags: string[] }) {
  return <div className="capability-tags">{tags.map((tag) => <span key={tag}>{tag}</span>)}</div>;
}
