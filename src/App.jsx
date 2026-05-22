import { useState } from "react";

const APPS_SCRIPT_URL = "https://script.google.com/a/macros/mercadolibre.com/s/AKfycbzDNfLJinmZiLl5sYhtF9vPLOjIpspoXs_RAmdPVvMwN0casIyh3nZjpYKg5Tmj1B4W/exec";
const PAISES = ["MLA","MLM","MLU","MLC","MPE","MCO"];

async function fetchRow(rowNum) {
  const url = `${APPS_SCRIPT_URL}?row=${rowNum}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.map(cell => cell !== null && cell !== undefined ? String(cell).trim() : "");
}

async function callClaude(apiKey, row, ot) {
  const fields = {
    solicitante: row[3] || "", nombre: row[7] || "", categoria: row[8] || "",
    pais: row[9] || "", contexto: row[10] || "", mensaje: row[11] || "",
    tipoVendedor: row[12] || "", base: row[13] || "", audiencia: row[14] || "",
    canales: row[15] || "", recurrencia: row[16] || "", ctaTexto: row[17] || "",
    ctaLink: row[18] || "", tyc: row[19] || "", kpi1: row[20] || "",
    kpi2: row[21] || "", links: row[22] || "", reqId: row[23] || "",
    approvalStatus: row[25] || "",
  };
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: "Procesás datos de planillas de Mercado Libre y devolvés JSON limpio. Solo JSON, sin markdown.",
      messages: [{ role: "user", content: `OT: ${ot}\nDatos: ${JSON.stringify(fields)}\n\nDevolvé este JSON exacto:\n{"nombre":"","pais":"","solicitante":"","equipo":"","tema":"","fechaInicio":"","fechaFin":"","categorias":"","tipoVendedor":"","contexto":"","mensaje":"","ctaTexto":"","ctaLink":"","tyc":"","canales":"","recurrencia":"","audiencia":"","base":"","kpi1":"","kpi2":"","links":"","reqId":"","approved":false}` }],
    }),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  return JSON.parse(data.content[0].text.replace(/```json|```/g, "").trim());
}

async function createGoogleDoc(brief, ot, folderId, token) {
  const content = `BRIEF DE COMUNICACIÓN\n\n${ot} | ${brief.pais}\n\nDatos Generales\n\nNombre de la activación\t${brief.nombre}\nPaís\t${brief.pais}\nSolicitante\t${brief.solicitante}\nTema / Tipo\t${brief.tema}\n\nContexto y Objetivo\n\nCategorías involucradas\t${brief.categorias}\nTipo de vendedor\t${brief.tipoVendedor || "—"}\nContexto y objetivo\t${brief.contexto}\n\nMensaje\n\nMensaje a comunicar\t${brief.mensaje || "TBD"}\nCTA texto\t${brief.ctaTexto || "TBD"}\nCTA link\t${brief.ctaLink || "TBD"}\nT&C / Link secundario\t${brief.tyc || "—"}\n\nCanales y Formato\n\nCanal(es) solicitados\t${brief.canales}\nRecurrencia\t${brief.recurrencia}\n\nAudiencia\n\nDescripción de la audiencia\t${brief.audiencia}\nLink a la base\t${brief.base || "TBD"}\n\nMétricas\n\nKPI principal\t${brief.kpi1}\nKPI secundario\t${brief.kpi2 || "—"}\n\nMaterial de Referencia\n\nLinks adicionales\t${brief.links || "—"}\n\nVEO Branding® — Documento de uso interno`;
  const createRes = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name: `BRIEF_${ot.replace(/\s+/g,"_")}`, mimeType: "application/vnd.google-apps.document", parents: folderId ? [folderId] : [] }),
  });
  const file = await createRes.json();
  if (!file.id) throw new Error("No se pudo crear el doc: " + JSON.stringify(file));
  await fetch(`https://www.googleapis.com/upload/drive/v3/files/${file.id}?uploadType=media&convert=true`, {
    method: "PATCH",
    headers: { "Authorization": `Bearer ${token}`, "Content-Type": "text/plain" },
    body: content,
  });
  return { id: file.id, url: `https://docs.google.com/document/d/${file.id}/edit` };
}

// VEO Logo SVG
function VeoLogo({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="8" fill="#0f0f0f"/>
      <text x="5" y="26" fontFamily="'Bebas Neue', sans-serif" fontSize="22" fill="#f5f0eb" letterSpacing="1">VEO</text>
    </svg>
  );
}

function TBD() {
  return (
    <span style={{display:"inline-block",background:"rgba(217,119,6,0.08)",color:"#b45309",border:"1px solid rgba(217,119,6,0.2)",borderRadius:4,padding:"1px 8px",fontSize:11,fontFamily:"monospace"}}>
      TBD
    </span>
  );
}

function BriefRow({ label, value }) {
  const empty = !value || value === "—" || value === "-" || value === "TBD";
  return (
    <div style={{display:"flex",gap:16,padding:"10px 20px",borderBottom:"1px solid #e8e8e8"}}>
      <span style={{fontSize:12,color:"#9ca3af",width:180,flexShrink:0,paddingTop:1}}>{label}</span>
      {empty ? <TBD /> : <span style={{fontSize:13,color:"#1a1a1a",lineHeight:1.5,flex:1}}>{value}</span>}
    </div>
  );
}

function BriefSection({ title, children }) {
  return (
    <div style={{border:"1px solid #e8e8e8",borderRadius:10,overflow:"hidden",marginBottom:12}}>
      <div style={{background:"#f7f7f7",padding:"8px 20px",borderBottom:"1px solid #e8e8e8"}}>
        <span style={{fontSize:10,letterSpacing:"0.15em",textTransform:"uppercase",color:"#9ca3af",fontFamily:"monospace"}}>{title}</span>
      </div>
      {children}
    </div>
  );
}

export default function App() {
  const [ot, setOt] = useState("");
  const [row, setRow] = useState("");
  const [folder, setFolder] = useState("11aT_2GYLKqsISyEV-jfwRLq3YEINJS9o");
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState([]);
  const [brief, setBrief] = useState(null);
  const [docUrl, setDocUrl] = useState("");
  const [error, setError] = useState("");

  const log = (msg, type = "run") => setLogs(p => [...p, { msg, type, id: Math.random() }]);

  const generate = async () => {
    if (!ot.trim()) { setError("Ingresá el nombre de la OT."); return; }
    if (!row || parseInt(row) < 2) { setError("Ingresá un número de fila válido (desde fila 2)."); return; }
    if (!apiKey.trim()) { setError("Ingresá tu API Key de Anthropic."); return; }
    setError(""); setLoading(true); setBrief(null); setDocUrl(""); setLogs([]);
    try {
      log(`Leyendo fila ${row} del Excel...`);
      const rowData = await fetchRow(parseInt(row));
      log("Fila leída correctamente", "ok");
      log("Claude procesando datos...");
      const parsed = await callClaude(apiKey, rowData, ot);
      log("Brief generado", "ok");
      setBrief(parsed);
      log("Creando Google Doc...");
      const SCOPES = "https://www.googleapis.com/auth/drive.file";
      const client = window.google?.accounts?.oauth2?.initTokenClient({
        client_id: "YOUR_CLIENT_ID",
        scope: SCOPES,
        callback: async (resp) => {
          if (resp.error) { log("Error OAuth: " + resp.error, "err"); setLoading(false); return; }
          try {
            const doc = await createGoogleDoc(parsed, ot, folder, resp.access_token);
            setDocUrl(doc.url);
            log("✓ Doc creado en Drive", "ok");
          } catch (e) { log("Error creando doc: " + e.message, "err"); }
          setLoading(false);
        }
      });
      client?.requestAccessToken();
      if (!window.google?.accounts) {
        log("(Drive deshabilitado en sandbox — brief generado igualmente)", "warn");
        setLoading(false);
      }
    } catch (e) {
      log("Error: " + e.message, "err");
      setError(e.message);
      setLoading(false);
    }
  };

  return (
    <div style={{ fontFamily: "'DM Sans',system-ui,sans-serif", background: "#f9f9f7", minHeight: "100vh", color: "#1a1a1a" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=DM+Sans:wght@300;400;500&family=DM+Mono:wght@400;500&display=swap');
        *{box-sizing:border-box;margin:0;padding:0}
        input,button{font-family:inherit}
        input[type=text],input[type=password],input[type=number]{
          background:#fff;
          border:1px solid #e2e2e2;
          border-radius:8px;
          color:#1a1a1a;
          font-size:14px;
          padding:10px 14px;
          width:100%;
          outline:none;
          transition:border-color .15s, box-shadow .15s;
        }
        input::placeholder{color:#c0c0c0}
        input:focus{border-color:#1a1a1a;box-shadow:0 0 0 3px rgba(0,0,0,0.06)}
        ::-webkit-scrollbar{width:4px}
        ::-webkit-scrollbar-thumb{background:#ddd;border-radius:2px}
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes blink{0%,100%{opacity:1}50%{opacity:.3}}
        @keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
      `}</style>

      {/* Top nav bar */}
      <div style={{ borderBottom: "1px solid #e8e8e8", background: "#fff", padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "space-between", height: 56 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <VeoLogo size={30} />
          <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 11, color: "#9ca3af", letterSpacing: "0.1em" }}>BRANDING STUDIO</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {PAISES.map(p => (
            <span key={p} style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#c0c0c0", background: "#f4f4f4", borderRadius: 4, padding: "3px 7px", letterSpacing: "0.05em" }}>{p}</span>
          ))}
        </div>
      </div>

      <div style={{ maxWidth: 680, margin: "0 auto", padding: "48px 24px" }}>

        {/* Header */}
        <div style={{ marginBottom: 40 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 16, marginBottom: 12 }}>
            <h1 style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 72, lineHeight: 0.88, letterSpacing: "0.02em", color: "#0f0f0f" }}>
              GENERA&shy;DOR<br />DE BRIEFS
            </h1>
            <div style={{ marginBottom: 6, paddingBottom: 4, borderBottom: "3px solid #0f0f0f" }}>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#9ca3af", letterSpacing: "0.15em", textTransform: "uppercase" }}>VEO × ML</span>
            </div>
          </div>
          <p style={{ fontSize: 13, color: "#9ca3af", lineHeight: 1.6 }}>
            Completá los datos y el brief se crea y sube a Drive automáticamente.
          </p>
        </div>

        {/* Campos */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>

          {/* OT */}
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9ca3af", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              OT <span style={{ color: "#d1d5db", fontWeight: 400 }}>número interno VEO</span>
            </label>
            <input type="text" value={ot} onChange={e => setOt(e.target.value)} placeholder="S01273 AR_Clips fashion" />
          </div>

          {/* Fila + Carpeta */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9ca3af", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                Fila <span style={{ color: "#d1d5db" }}>desde fila 2</span>
              </label>
              <input type="number" min={2} value={row} onChange={e => setRow(e.target.value)} placeholder="133" />
            </div>
            <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
              <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9ca3af", display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                Carpeta Drive <span style={{ color: "#d1d5db" }}>ID</span>
              </label>
              <input type="text" value={folder} onChange={e => setFolder(e.target.value)} placeholder="ID de la carpeta" />
            </div>
          </div>

          {/* API Key */}
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 12, padding: "20px 24px", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            <label style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, letterSpacing: "0.15em", textTransform: "uppercase", color: "#9ca3af", display: "block", marginBottom: 10 }}>
              API Key de Anthropic
            </label>
            <div style={{ display: "flex", gap: 8 }}>
              <input type={showKey ? "text" : "password"} value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="sk-ant-api03-..." />
              <button
                onClick={() => setShowKey(v => !v)}
                style={{ background: "#f7f7f7", border: "1px solid #e2e2e2", borderRadius: 8, color: "#6b7280", fontSize: 13, padding: "10px 16px", cursor: "pointer", whiteSpace: "nowrap", transition: "background .15s" }}
              >
                {showKey ? "Ocultar" : "Ver"}
              </button>
            </div>
            <p style={{ fontSize: 11, color: "#d1d5db", marginTop: 8, fontFamily: "'DM Mono',monospace" }}>Tu key no se almacena. Solo se usa en esta sesión.</p>
          </div>
        </div>

        {error && (
          <div style={{ background: "rgba(239,68,68,.05)", border: "1px solid rgba(239,68,68,.2)", borderRadius: 8, padding: "12px 16px", marginBottom: 16, color: "#dc2626", fontSize: 13 }}>
            ✕ {error}
          </div>
        )}

        {/* Botón */}
        <button
          onClick={generate}
          disabled={loading}
          style={{
            width: "100%", background: loading ? "#f4f4f4" : "#0f0f0f", border: "none", borderRadius: 10,
            color: loading ? "#9ca3af" : "#f5f0eb", fontSize: 13, fontWeight: 500, padding: "16px 24px",
            cursor: loading ? "not-allowed" : "pointer", letterSpacing: "0.08em", textTransform: "uppercase",
            fontFamily: "'DM Mono',monospace", display: "flex", alignItems: "center", justifyContent: "center",
            gap: 10, marginBottom: 20, transition: "all .15s", boxShadow: loading ? "none" : "0 2px 12px rgba(0,0,0,0.12)"
          }}
        >
          {loading
            ? <><span style={{ width: 14, height: 14, border: "2px solid #d1d5db", borderTopColor: "#9ca3af", borderRadius: "50%", display: "inline-block", animation: "spin .7s linear infinite" }} /> Generando brief...</>
            : "Generar Brief desde Planilla →"
          }
        </button>

        {/* Logs */}
        {logs.length > 0 && (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 10, padding: "14px 16px", marginBottom: 24, boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
            {logs.map(l => (
              <div key={l.id} style={{ display: "flex", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%", marginTop: 5, flexShrink: 0,
                  background: l.type === "ok" ? "#16a34a" : l.type === "err" ? "#dc2626" : l.type === "warn" ? "#d97706" : "#d97706",
                  animation: l.type === "run" ? "blink 1s infinite" : undefined
                }} />
                <span style={{
                  fontSize: 11,
                  color: l.type === "err" ? "#dc2626" : l.type === "ok" ? "#16a34a" : l.type === "warn" ? "#d97706" : "#9ca3af",
                  fontFamily: "'DM Mono',monospace", lineHeight: 1.5
                }}>{l.msg}</span>
              </div>
            ))}
          </div>
        )}

        {/* Doc link */}
        {docUrl && (
          <div style={{ background: "rgba(22,163,74,.05)", border: "1px solid rgba(22,163,74,.2)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between", animation: "fadeUp .3s ease" }}>
            <span style={{ fontSize: 13, color: "#16a34a" }}>✓ Doc creado en Drive</span>
            <a href={docUrl} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: "#16a34a", fontFamily: "'DM Mono',monospace", textDecoration: "none", border: "1px solid rgba(22,163,74,.3)", borderRadius: 6, padding: "5px 12px" }}>
              Abrir ↗
            </a>
          </div>
        )}

        {/* Brief preview */}
        {brief && (
          <div style={{ background: "#fff", border: "1px solid #e8e8e8", borderRadius: 16, overflow: "hidden", animation: "fadeUp .3s ease", boxShadow: "0 4px 24px rgba(0,0,0,0.07)" }}>

            {/* Brief header con logo */}
            <div style={{ background: "#0f0f0f", padding: "20px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <svg width="28" height="28" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="36" height="36" rx="6" fill="#f5f0eb"/>
                    <text x="5" y="26" fontFamily="'Bebas Neue', sans-serif" fontSize="22" fill="#0f0f0f" letterSpacing="1">VEO</text>
                  </svg>
                  <div style={{ width: 1, height: 28, background: "#2a2a2a" }} />
                </div>
                <div>
                  <p style={{ fontFamily: "'Bebas Neue',sans-serif", fontSize: 22, letterSpacing: "0.04em", color: "#f5f0eb", margin: 0, lineHeight: 1 }}>{ot}</p>
                  <p style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#525252", margin: "4px 0 0" }}>{brief.reqId || "—"} · {brief.pais || "—"}</p>
                </div>
              </div>
              <span style={{
                background: brief.approved ? "rgba(34,197,94,.12)" : "rgba(245,158,11,.12)",
                color: brief.approved ? "#86efac" : "#fbbf24",
                border: `1px solid ${brief.approved ? "rgba(34,197,94,.3)" : "rgba(245,158,11,.3)"}`,
                borderRadius: 20, padding: "4px 12px", fontSize: 11, fontFamily: "'DM Mono',monospace"
              }}>
                {brief.approved ? "✓ Approved" : "Pending"}
              </span>
            </div>

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 0 }}>
              <BriefSection title="Datos Generales">
                <BriefRow label="Nombre de la activación" value={brief.nombre} />
                <BriefRow label="País" value={brief.pais} />
                <BriefRow label="Solicitante" value={brief.solicitante} />
                <BriefRow label="Tema / Tipo" value={brief.tema} />
              </BriefSection>
              <BriefSection title="Contexto y Objetivo">
                <BriefRow label="Categorías involucradas" value={brief.categorias} />
                <BriefRow label="Tipo de vendedor" value={brief.tipoVendedor} />
                <BriefRow label="Contexto y objetivo" value={brief.contexto} />
              </BriefSection>
              <BriefSection title="Mensaje">
                <BriefRow label="Mensaje a comunicar" value={brief.mensaje} />
                <BriefRow label="CTA texto" value={brief.ctaTexto} />
                <BriefRow label="CTA link" value={brief.ctaLink} />
                <BriefRow label="T&C / Link secundario" value={brief.tyc} />
              </BriefSection>
              <BriefSection title="Canales y Formato">
                <BriefRow label="Canal(es) solicitados" value={brief.canales} />
                <BriefRow label="Recurrencia" value={brief.recurrencia} />
              </BriefSection>
              <BriefSection title="Audiencia">
                <BriefRow label="Descripción de la audiencia" value={brief.audiencia} />
                <BriefRow label="Link a la base" value={brief.base} />
              </BriefSection>
              <BriefSection title="Métricas">
                <BriefRow label="KPI principal" value={brief.kpi1} />
                <BriefRow label="KPI secundario" value={brief.kpi2} />
              </BriefSection>
              <BriefSection title="Material de Referencia">
                <BriefRow label="Links adicionales" value={brief.links} />
              </BriefSection>
            </div>

            <div style={{ borderTop: "1px solid #e8e8e8", padding: "12px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#f9f9f7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="16" height="16" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect width="36" height="36" rx="6" fill="#0f0f0f"/>
                  <text x="5" y="26" fontFamily="'Bebas Neue', sans-serif" fontSize="22" fill="#f5f0eb" letterSpacing="1">VEO</text>
                </svg>
                <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#c0c0c0" }}>VEO Branding® — Documento de uso interno</span>
              </div>
              <span style={{ fontFamily: "'DM Mono',monospace", fontSize: 10, color: "#c0c0c0" }}>{new Date().toLocaleDateString("es-AR")}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}