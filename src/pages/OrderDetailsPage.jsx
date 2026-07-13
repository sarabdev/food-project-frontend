import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Edit3, FileText, Printer, Save, Trash2, Truck } from "lucide-react";
import { PageHeader } from "../components/PageHeader";
import { StatusBadge } from "../components/StatusBadge";
import { Modal } from "../components/Modal";
import { api, assetUrl, messageFromError } from "../lib/api";
import { useAuth } from "../context/AuthContext";

const documents = [
  ["sale_contract", "Sale Contract", "Actual client, pricing and payment terms"],
  ["customs_packing_list", "Customs Packing / Weight List", "Customs consignee, package and weight details"],
  ["customs_commercial_invoice", "Customs Commercial Invoice", "Customs consignee and per-kilogram values"],
  ["client_packing_list", "Client Packing List", "Actual client and packing details"],
  ["client_commercial_invoice", "Client Commercial Invoice", "Actual client and per-carton values"],
  ["gate_pass", "Gate Pass", "Loading, vehicle, seals and dispatch quantities"],
  ["bl_instructions", "B/L Instructions", "Shipper, consignee, notify party and freight instructions"],
  ["certificate_of_origin", "Certificate of Origin", "Origin declaration and shipment summary"]
];

const company = {
  address: "P-61, Main Narwala Road, School Stop, Marzi Pura, Faisalabad, Pakistan",
  contact: "Tel# +92-41-269 3860, email: zafoodindustry@hotmail.com, website: www.zafood.net",
  bank: [
    ["To the Standard Chartered Bank Ltd, UAE A/C", "358-020675-001"],
    ["Beneficiary", "Z.A FOOD INDUSTRIES"],
    ["Bank", "Dubai Islamic Bank Pakistan Ltd"],
    ["Branch", "Main Branch, Faisalabad"],
    ["A/C", "3587-020675-001"],
    ["Swift", "DUIBPKKA"],
    ["IBAN", "PK94DUIB0000000055839002"],
    ["Swift NY Code", "SCBL US 33"]
  ],
  terms: [
    "Goods will be loaded into 1 x 40 feet container.",
    "Quantity and quality are as per final documents.",
    "Freight will be charged actual freight at the time of loading, if any.",
    "Above prices are valid for 15 days only.",
    "Bank commission, deduction and handling charges with the buyer value without.",
    "All outside Pakistan charges on buyers account.",
    "Insurance: buyer is strongly recommended to cover insurance at his own.",
    "Stock payment to be transferred for each order proceeding."
  ]
};

const emptyGatePass = {
  clearing_agent_id: "",
  transporter_name: "",
  transporter_contact: "",
  transporter_phone: "",
  truck_number: "",
  driver_name: "",
  driver_phone: "",
  loading_address: "Z.A Food Industries, Marzi Pura, Narwala Road, Faisalabad",
  delivery_address: "Karachi - Pakistan",
  seal_numbers: ""
};

export function OrderDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [parties, setParties] = useState([]);
  const [preview, setPreview] = useState(null);
  const [gatePassOpen, setGatePassOpen] = useState(false);
  const [gatePassForm, setGatePassForm] = useState(emptyGatePass);
  const [gatePassError, setGatePassError] = useState("");
  const [gatePassSaving, setGatePassSaving] = useState(false);
  const { can } = useAuth();

  useEffect(() => {
    api.get(`/orders/${id}`).then(({ data }) => setOrder(data.order));
    api.get("/parties").then(({ data }) => setParties(data.parties));
  }, [id]);

  const totals = useMemo(() => order?.items.reduce((sum, item) => ({
    packages: sum.packages + Number(item.quantity),
    net: sum.net + Number(item.total_net_weight),
    gross: sum.gross + Number(item.total_gross_weight),
    client: sum.client + Number(item.client_value),
    customs: sum.customs + Number(item.customs_value)
  }), { packages: 0, net: 0, gross: 0, client: 0, customs: 0 }), [order]);

  if (!order) return <div className="py-20 text-center text-slate-400">Loading order...</div>;
  const canEditOrder = can("orders.edit") && !["shipped", "completed", "cancelled"].includes(order.status);
  const canDeleteOrder = can("orders.delete") && !["shipped", "completed"].includes(order.status);
  const clearingAgents = parties.filter((party) => party.party_type === "clearing_agent");
  const hasGatePassInfo = Boolean(order.truck_number || order.driver_name || order.driver_phone || order.transporter_name || order.transporter_contact || order.transporter_phone || order.clearing_agent_id || sealList(order.seal_numbers).length);

  async function openPreview(document) {
    setPreview(document);
    await api.post(`/orders/${id}/document-audit`, { document_type: document[0], action_name: "previewed" });
  }

  function openGatePassForm() {
    setGatePassForm(toGatePassForm(order));
    setGatePassError("");
    setGatePassOpen(true);
  }

  async function saveGatePass(event) {
    event.preventDefault();
    setGatePassSaving(true);
    setGatePassError("");
    try {
      await api.patch(`/orders/${id}/gate-pass`, {
        ...gatePassForm,
        seal_numbers: gatePassForm.seal_numbers.split(/\r?\n|,/).map((seal) => seal.trim()).filter(Boolean)
      });
      const { data } = await api.get(`/orders/${id}`);
      setOrder(data.order);
      setGatePassOpen(false);
    } catch (requestError) {
      setGatePassError(messageFromError(requestError));
    } finally {
      setGatePassSaving(false);
    }
  }

  async function printDocument() {
    await api.post(`/orders/${id}/document-audit`, { document_type: preview[0], action_name: "printed" });
    window.print();
  }

  async function deleteOrder() {
    if (!window.confirm(`Delete order ${order.invoice_number}? This cannot be undone.`)) return;
    await api.delete(`/orders/${order.id}`);
    navigate("/orders");
  }

  return (
    <>
      <PageHeader
        eyebrow="Export order"
        title={order.invoice_number}
        description={`${order.client_name} - ${new Date(order.contract_date).toLocaleDateString()}`}
        action={<div className="flex flex-wrap items-center gap-3">{canEditOrder && <Link to={`/orders/${order.id}/edit`} className="btn-secondary"><Edit3 size={18} /> Edit order</Link>}{canDeleteOrder && <button type="button" onClick={deleteOrder} className="btn-secondary text-red-600 hover:text-red-700"><Trash2 size={18} /> Delete order</button>}<StatusBadge status={order.status} /></div>}
      />
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <section className="panel p-5 md:p-7">
            <h2 className="mb-5 font-bold">Shipment summary</h2>
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <Info label="Client" value={order.client_name} />
              <Info label="Customs consignee" value={order.customs_consignee_name} />
              <Info label="Route" value={`${order.port_of_loading || "-"} -> ${order.port_of_destination || "-"}`} />
              <Info label="Container" value={[order.container_number, order.container_type].filter(Boolean).join(" / ") || "Not assigned"} />
            </div>
          </section>
          <section className="panel overflow-hidden">
            <div className="border-b px-5 py-4 md:px-7"><h2 className="font-bold">Order lines</h2></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3">Product</th>
                    <th className="px-5 py-3">Packages</th>
                    <th className="px-5 py-3">Net weight</th>
                    <th className="px-5 py-3">Gross weight</th>
                    <th className="px-5 py-3">Client value</th>
                    <th className="px-5 py-3">Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-5 py-4"><div className="font-semibold">{item.product_name}</div><div className="text-xs text-slate-400">HS {item.hs_code || "-"}</div></td>
                      <td className="px-5 py-4">{item.quantity} {item.quantity_unit}</td>
                      <td className="px-5 py-4">{Number(item.total_net_weight).toLocaleString()} kg</td>
                      <td className="px-5 py-4">{Number(item.total_gross_weight).toLocaleString()} kg</td>
                      <td className="px-5 py-4">{order.currency} {Number(item.client_value).toLocaleString()}</td>
                      <td className="px-5 py-4">{item.is_sample ? <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">Sample</span> : "Commercial"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
          {canEditOrder && (
            <section className="panel flex flex-wrap items-center justify-between gap-4 p-5 md:p-6">
              <div className="flex items-start gap-4">
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><Truck size={20} /></div>
                <div>
                  <h2 className="font-bold">Gate pass info</h2>
                  <p className="mt-1 text-sm text-slate-500">{hasGatePassInfo ? "Vehicle, driver and seal details are filled for this order." : "Add vehicle, driver and seal details for this order."}</p>
                </div>
              </div>
              <button type="button" onClick={openGatePassForm} className="btn-secondary">
                <Truck size={18} /> {hasGatePassInfo ? "Update gate pass info" : "Fill gate pass info"}
              </button>
            </section>
          )}
          <section>
            <h2 className="mb-4 text-lg font-bold">Documents</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {documents.map((document) => (
                <button key={document[0]} onClick={() => openPreview(document)} className="panel group flex items-start gap-4 p-5 text-left transition hover:-translate-y-0.5 hover:border-forest-300">
                  <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-forest-50 text-forest-700"><FileText size={20} /></div>
                  <div><div className="font-bold group-hover:text-forest-700">{document[1]}</div><div className="mt-1 text-sm leading-5 text-slate-500">{document[2]}</div></div>
                </button>
              ))}
            </div>
          </section>
        </div>
        <aside className="space-y-4">
          <div className="panel p-6"><h2 className="mb-5 font-bold">Calculated totals</h2><div className="space-y-4"><Info label="Total packages" value={totals.packages.toLocaleString()} /><Info label="Net weight" value={`${totals.net.toLocaleString()} kg`} /><Info label="Gross weight" value={`${totals.gross.toLocaleString()} kg`} /><Info label="Client invoice value" value={`${order.currency} ${totals.client.toLocaleString()}`} /><Info label="Customs invoice value" value={`${order.currency} ${totals.customs.toLocaleString()}`} /></div></div>
          <div className="rounded-2xl bg-forest-900 p-6 text-white"><div className="text-xs font-bold uppercase tracking-widest text-gold">Document rule</div><p className="mt-3 text-sm leading-6 text-white/65">Samples are included in package and weight totals, but excluded from both commercial invoice values.</p></div>
        </aside>
      </div>
      <Modal open={Boolean(preview)} title={preview?.[1]} onClose={() => setPreview(null)} wide>
        {preview?.[0] === "sale_contract" ? (
          <SalesContractDocument order={order} />
        ) : preview?.[0] === "customs_packing_list" || preview?.[0] === "client_packing_list" ? (
          <PackingWeightListDocument order={order} documentType={preview[0]} />
        ) : preview?.[0] === "customs_commercial_invoice" || preview?.[0] === "client_commercial_invoice" ? (
          <CommercialInvoiceDocument order={order} documentType={preview[0]} />
        ) : preview?.[0] === "gate_pass" ? (
          <GatePassDocument order={order} totals={totals} />
        ) : preview?.[0] === "bl_instructions" ? (
          <BLInstructionsDocument order={order} totals={totals} />
        ) : preview?.[0] === "certificate_of_origin" ? (
          <CertificateOfOriginDocument order={order} totals={totals} />
        ) : (
          <GenericDocumentPreview order={order} preview={preview} />
        )}
        <div className="no-print mt-5 flex justify-end"><button onClick={printDocument} className="btn-primary"><Printer size={18} /> Print document</button></div>
      </Modal>
      <Modal open={gatePassOpen} title="Gate pass info" onClose={() => setGatePassOpen(false)} wide>
        <form onSubmit={saveGatePass}>
          <div className="grid gap-5 md:grid-cols-2">
            <SelectField label="Clearing agent" value={gatePassForm.clearing_agent_id} onChange={(value) => setGatePassForm({ ...gatePassForm, clearing_agent_id: value })} options={clearingAgents} />
            <div className="md:col-span-2">
              <h3 className="mb-3 text-sm font-bold text-ink">Transporter details</h3>
              <div className="grid gap-5 md:grid-cols-3">
                <TextField label="Transporter name" value={gatePassForm.transporter_name} onChange={(value) => setGatePassForm({ ...gatePassForm, transporter_name: value })} />
                <TextField label="Contact person" value={gatePassForm.transporter_contact} onChange={(value) => setGatePassForm({ ...gatePassForm, transporter_contact: value })} />
                <TextField label="Transporter phone" value={gatePassForm.transporter_phone} onChange={(value) => setGatePassForm({ ...gatePassForm, transporter_phone: value })} />
              </div>
            </div>
            <TextField label="Truck no." value={gatePassForm.truck_number} onChange={(value) => setGatePassForm({ ...gatePassForm, truck_number: value })} />
            <TextField label="Driver name" value={gatePassForm.driver_name} onChange={(value) => setGatePassForm({ ...gatePassForm, driver_name: value })} />
            <TextField label="Driver mobile no." value={gatePassForm.driver_phone} onChange={(value) => setGatePassForm({ ...gatePassForm, driver_phone: value })} />
            <div className="md:col-span-2"><TextField label="Loading address" value={gatePassForm.loading_address} onChange={(value) => setGatePassForm({ ...gatePassForm, loading_address: value })} /></div>
            <div className="md:col-span-2"><TextField label="Delivery address" value={gatePassForm.delivery_address} onChange={(value) => setGatePassForm({ ...gatePassForm, delivery_address: value })} /></div>
            <div className="md:col-span-2"><TextAreaField label="Seal numbers" value={gatePassForm.seal_numbers} onChange={(value) => setGatePassForm({ ...gatePassForm, seal_numbers: value })} placeholder="One seal number per line or comma-separated" /></div>
          </div>
          {gatePassError && <div className="mt-5 rounded-xl bg-red-50 p-3 text-sm text-red-700">{gatePassError}</div>}
          <div className="mt-7 flex justify-end gap-3">
            <button type="button" className="btn-secondary" onClick={() => setGatePassOpen(false)}>Cancel</button>
            <button className="btn-primary" disabled={gatePassSaving}><Save size={18} /> {gatePassSaving ? "Saving..." : "Save gate pass info"}</button>
          </div>
        </form>
      </Modal>
    </>
  );
}

function toGatePassForm(order) {
  return {
    ...emptyGatePass,
    clearing_agent_id: fieldValue(order.clearing_agent_id),
    transporter_name: fieldValue(order.transporter_name),
    transporter_contact: fieldValue(order.transporter_contact),
    transporter_phone: fieldValue(order.transporter_phone),
    truck_number: fieldValue(order.truck_number),
    driver_name: fieldValue(order.driver_name),
    driver_phone: fieldValue(order.driver_phone),
    loading_address: fieldValue(order.loading_address) || emptyGatePass.loading_address,
    delivery_address: fieldValue(order.delivery_address) || emptyGatePass.delivery_address,
    seal_numbers: sealText(order.seal_numbers)
  };
}

function CertificateOfOriginDocument({ order, totals }) {
  const commercialItems = order.items.filter((item) => !item.is_sample);
  const firstItem = commercialItems[0] || order.items[0];
  const commercialCartons = commercialItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const invoiceValue = commercialItems.reduce((sum, item) => sum + Number(item.client_value || 0), 0);

  return (
    <div className="print-document origin-sheet bg-white text-[#202020]">
      <h1>Certificate of Origin</h1>

      <section className="origin-shipper">
        <strong>Z.A FOOD INDUSTRIES.</strong>
        <span>P-61 SCHOOL STOP, KOTHI SADAAT ROAD,</span>
        <span>MARZI PURA, FAISALABAD - PAKISTAN,</span>
        <span>TEL: 92-41-2693860</span>
      </section>

      <section className="origin-buyer">
        <strong>{order.client_name || "-"}</strong>
        <span>{formatAddress(order.client_address, order.client_city, order.client_country)}</span>
      </section>

      <section className="origin-route">
        <strong>{String(order.shipped_per || "BY SEA").toUpperCase()}</strong>
        <div><b>FROM :-</b> {String(order.port_of_loading || "KARACHI, PAKISTAN").toUpperCase()}</div>
        <div><b>TO :-</b> {String(order.port_of_destination || "-").toUpperCase()}</div>
        {order.final_destination && <div className="origin-indent">{String(order.final_destination).toUpperCase()}</div>}
        <div className="origin-spacer"><b>SHIPPED PER :</b> {order.vessel_name || order.shipped_per || ""}</div>
        <div><b>B/L NO.</b> {order.bl_number || ""}</div>
        <div><b>Dated:</b> {formatDate(order.bl_date) || ""}</div>
      </section>

      <section className="origin-summary">
        <div className="origin-cartons"><strong>CARTONS</strong><span>{compactNumber(commercialCartons)}</span></div>
        <div className="origin-goods">
          <strong>{compactNumber(commercialCartons)} CARTONS OF CONFECTIONERY PRODUCTS</strong>
          {firstItem && (
            <>
              <span>{firstItem.description_override || firstItem.product_name}</span>
              <span>{formatPackagingLine(firstItem)}</span>
              <span>HS CODE: {firstItem.hs_code || "-"}</span>
            </>
          )}
          <div className="origin-reference">
            <span>Export Reference:</span>
            <strong>{order.invoice_number}</strong>
          </div>
        </div>
        <div className="origin-weight-value">
          <div><strong>Gross Wt:</strong><span>{compactNumber(Math.round(totals.gross))}</span><small>Kgs</small></div>
          <div><strong>Net Wt:</strong><span>{compactNumber(Math.round(totals.net))}</span><small>Kgs</small></div>
        </div>
        <div className="origin-value">
          <strong>{order.currency || "USD"}</strong>
          <span>{decimalMoney(invoiceValue)}</span>
        </div>
      </section>
    </div>
  );
}

function BLInstructionsDocument({ order, totals }) {
  const commercialItems = order.items.filter((item) => !item.is_sample);
  const sampleItems = order.items.filter((item) => item.is_sample);
  const commercialCartons = commercialItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const sampleCartons = sampleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="print-document bl-sheet bg-white text-[#202020]">
      <h1>B/L INSTRUCTIONS</h1>

      <section className="bl-top-grid">
        <div className="bl-party-stack">
          <BLBlock title="Shipper">
            <strong>Z.A FOOD INDUSTRIES.</strong>
            <span>P-61 SCHOOL STOP, KOTHI SADAAT ROAD,</span>
            <span>MARZI PURA, FAISALABAD - PAKISTAN,</span>
            <span>TEL: 92-41-2693860</span>
          </BLBlock>
          <BLBlock title="Consignee">
            <strong>{order.customs_consignee_name || "-"}</strong>
            <span>{formatAddress(order.customs_consignee_address, order.customs_consignee_city, order.customs_consignee_country)}</span>
          </BLBlock>
        </div>
        <div className="bl-weight-box">
          <div><strong>Gross<br />Weight</strong><span>{compactNumber(Math.round(totals.gross))}<br />Kgs.</span></div>
          <div><strong>Net<br />Weight</strong><span>{compactNumber(Math.round(totals.net))}<br />Kgs.</span></div>
        </div>
      </section>

      <section className="bl-port-grid">
        <div>
          <BLBlock title="Notify Party:">
            <strong>{order.client_name || "-"}</strong>
            <span>{formatAddress(order.client_address, order.client_city, order.client_country)}</span>
          </BLBlock>
          <BLBlock title="Port of Loading">
            <span>{order.port_of_loading || "KARACHI, PAKISTAN"}</span>
          </BLBlock>
        </div>
        <BLBlock title="Port of Discharge">
          <span>{order.port_of_destination || "-"}</span>
          <span>{order.final_destination || ""}</span>
        </BLBlock>
      </section>

      <section className="bl-body-grid">
        <div className="bl-carton-count">{compactNumber(commercialCartons)}<br />CARTONS</div>
        <div className="bl-description">
          <h2>DESCRIPTION OF GOODS</h2>
          <strong>{compactNumber(commercialCartons)} CARTONS OF CONFECTIONERY PRODUCTS</strong>
          {sampleCartons > 0 && <strong>{compactNumber(sampleCartons)} BAGS OF RICE (FOR SAMPLE)</strong>}
          {order.items.map((item) => (
            <div key={item.id} className="bl-product-line">
              <strong>{item.description_override || item.product_name}</strong>
              {!item.is_sample && <span>{formatPackagingLine(item)}</span>}
              <span>HS CODE: {item.hs_code || "-"}</span>
            </div>
          ))}
          <div className="bl-reference">
            <span><strong>G.D NO.</strong></span>
            <span><strong>Export Reference:</strong>&nbsp;&nbsp;{order.invoice_number}</span>
          </div>
          <div className="bl-transit-note">Intransit to NIGERIA - onward carriage from Cotonou to Nigeria<br />is arranged by Merchant for account and risk of Merchant.</div>
          <div className="bl-free-days">
            <strong>PLZ ALSO MENTION FREE DAYS TIME AT THE DESTINATION</strong>
            <span>SHIPMENT MAY ONLY BE RELEASED WITH THE PRESENTATION OF</span>
            <span>FULL THREE SET OF ORIGINAL W/BL</span>
            <span>NOTE - FULL NAME, ADDRESS WITH TEL/FAX NO. OF CARRYING</span>
            <span>VESSEL'S AGENT AT THE PORT OF DISCHARGE</span>
          </div>
        </div>
        <aside className="bl-side">
          <span>{compactNumber(order.cbm)} CBM</span>
          <strong>{order.freight_term || "FREIGHT PREPAID"}</strong>
        </aside>
      </section>

      <section className="bl-summary">
        <h2>S U M M A R Y</h2>
        <table>
          <thead><tr><th>CONTAINER NO.</th><th>CARTONS</th><th>NET WT</th><th>GROSS WT</th></tr></thead>
          <tbody>
            <tr><td>{order.container_number || "As Per Schedule"}</td><td>{compactNumber(commercialCartons)}</td><td>{compactNumber(Math.round(totals.net))}</td><td>{compactNumber(Math.round(totals.gross))}</td></tr>
            <tr><td><strong>TOTAL:-</strong></td><td><strong>{compactNumber(commercialCartons)}</strong></td><td><strong>{compactNumber(Math.round(totals.net))}</strong></td><td><strong>{compactNumber(Math.round(totals.gross))}</strong></td></tr>
          </tbody>
        </table>
      </section>
    </div>
  );
}

function BLBlock({ title, children }) {
  return (
    <div className="bl-block">
      <h3>{title}</h3>
      <div>{children}</div>
    </div>
  );
}

function GatePassDocument({ order, totals }) {
  const commercialItems = order.items.filter((item) => !item.is_sample);
  const sampleItems = order.items.filter((item) => item.is_sample);
  const seals = sealList(order.seal_numbers);
  const clearingName = order.clearing_agent_name || "A.A ENTERPRISES, KARACHI";
  const clearingPhones = [order.clearing_agent_phone, order.clearing_agent_contact].filter(Boolean);
  const transporterName = [
    order.transporter_name,
    order.transporter_contact,
    order.transporter_phone
  ].filter(Boolean).join(" / ") || "-";

  return (
    <div className="print-document gate-pass-sheet bg-white text-[#202020]">
      <header className="gate-brand"><img src="/brand/za-header.png" alt="Z.A Food Industries" /></header>

      <section className="gate-title-row">
        <div>Gate Pass # <strong>{order.invoice_number}</strong></div>
        <h1>GATE PASS</h1>
        <div><strong>DATED :</strong>&nbsp;&nbsp;{formatDate(order.contract_date)}</div>
      </section>

      <section className="gate-agent-box">
        <div className="gate-agent-title">PLZ CONTACT WITH CLEARING AGENT</div>
        <strong>{clearingName}</strong>
        <div className="gate-agent-phones">
          {(clearingPhones.length ? clearingPhones : ["0342-6661110", "0346-8288268", "0345-8288973", "0345-8293055"]).slice(0, 4).map((phone, index) => (
            <span key={`${phone}-${index}`}>MOBILE # {phone}</span>
          ))}
        </div>
      </section>

      <section className="gate-route-box">
        <div><strong>LOADING</strong>&nbsp;&nbsp;{order.loading_address || "Z.A FOOD INDUSTRIES, MARZI PURA, NARWALA ROAD, FAISALABAD"}</div>
        <div><strong>DELIVERY</strong>&nbsp;&nbsp;{order.delivery_address || "KARACHI - PAKISTAN"}</div>
      </section>

      <section className="gate-vehicle-grid">
        <div></div>
        <InfoRows rows={[
          ["CONTAINER NO.", order.container_number || "As Per Schedule"],
          ["TRUCK NO.", order.truck_number || "-"],
          ["DRIVER'S NAME", order.driver_name || "-"],
          ["MOBILE NO.", order.driver_phone || "-"],
          ["TRANSPORTER", transporterName]
        ]} />
      </section>

      <table className="gate-table">
        <colgroup>
          <col className="gate-col-serial" />
          <col className="gate-col-desc" />
          <col className="gate-col-qty" />
        </colgroup>
        <thead>
          <tr>
            <th>Sr. No.</th>
            <th>Description of Goods</th>
            <th>Quantity<br />(Carton)</th>
          </tr>
        </thead>
        <tbody>
          <tr className="gate-group-row"><td></td><td>{compactNumber(commercialItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0))} CARTONS OF CONFECTIONERY PRODUCTS</td><td></td></tr>
          {sampleItems.length > 0 && <tr className="gate-group-row"><td></td><td>{compactNumber(sampleItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0))} BAGS OF RICE (FOR SAMPLE)</td><td></td></tr>}
          {commercialItems.map((item, index) => <GatePassLine key={item.id} item={item} index={index + 1} />)}
          {sampleItems.length > 0 && <tr className="gate-sample-label"><td></td><td>FOR SAMPLE</td><td></td></tr>}
          {sampleItems.map((item, index) => <GatePassLine key={item.id} item={item} index={commercialItems.length + index + 1} isSample />)}
          <tr className="gate-seal-row">
            <td></td>
            <td>{seals.map((seal, index) => <span key={seal}>SEAL NO. Z.A FOOD IND. {seal}</span>)}</td>
            <td></td>
          </tr>
          <tr className="gate-total-row">
            <td></td>
            <td></td>
            <td><span>TOTAL CARTONS :-</span><strong>{compactNumber(totals.packages)}</strong></td>
          </tr>
        </tbody>
      </table>

      <section className="gate-cert-sign">
        <div><strong>CERTIFIED THAT GOODS ARE OF PAKISTAN ORIGIN</strong></div>
        <div className="gate-signature">
          <span>For Z.A Food Industries</span>
          <img src="/brand/signature-stamp.png" alt="Authorized signature" />
          <strong>Authorised Signature</strong>
        </div>
      </section>

      <footer className="gate-footer">
        <div>Address :- &nbsp; P-61, SCHOOL STOP, MARZI PURA, NARWALA ROAD, FAISALABAD - PAKISTAN</div>
        <div>Phone :- &nbsp; +92-41-2693860, 2699895</div>
      </footer>
    </div>
  );
}

function GatePassLine({ item, index, isSample = false }) {
  return (
    <tr>
      <td>{index}</td>
      <td className="gate-description">
        <strong>{item.description_override || item.product_name}</strong>
        {!isSample && <span>{formatPackagingLine(item)}</span>}
      </td>
      <td>{compactNumber(item.quantity)}{isSample ? <><br />{unitShortLabel(item.quantity_unit)}</> : null}</td>
    </tr>
  );
}

function CommercialInvoiceDocument({ order, documentType }) {
  const isCustoms = documentType === "customs_commercial_invoice";
  const consignee = isCustoms ? {
    name: order.customs_consignee_name,
    address: order.customs_consignee_address,
    city: order.customs_consignee_city,
    country: order.customs_consignee_country
  } : {
    name: order.client_name,
    address: order.client_address,
    city: order.client_city,
    country: order.client_country
  };
  const commercialItems = order.items.filter((item) => !item.is_sample);
  const sampleItems = order.items.filter((item) => item.is_sample);
  const invoiceTotal = commercialItems.reduce((sum, item) => sum + invoiceLineValue(item, isCustoms), 0);
  const advanceAmount = isCustoms ? 0 : invoiceTotal * (Number(order.advance_percentage || 0) / 100);
  const balanceAmount = invoiceTotal - advanceAmount;
  const netWeight = order.items.reduce((sum, item) => sum + Number(item.total_net_weight || 0), 0);
  const grossWeight = order.items.reduce((sum, item) => sum + Number(item.total_gross_weight || 0), 0);
  const commercialCartons = commercialItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  return (
    <div className="print-document commercial-invoice-sheet bg-white text-[#202020]">
      <header className="invoice-brand"><img src="/brand/za-header.png" alt="Z.A Food Industries" /></header>
      <section className="invoice-top">
        <div className="invoice-applicant">
          <strong>Applicant</strong>
          <span>{consignee.name || "-"}</span>
          <span>{formatAddress(consignee.address, consignee.city, consignee.country)}</span>
        </div>
        <div className="invoice-gd">G.D NO.</div>
        <div className="invoice-title-block">
          <h1>COMMERCIAL INVOICE</h1>
          <InfoRows rows={[
            ["Invoice No.", order.invoice_number],
            ["Dated", formatDate(order.contract_date)]
          ]} />
        </div>
      </section>

      <section className="invoice-meta-grid">
        <MetaText label="Port of Loading" value={order.port_of_loading || "KARACHI, PAKISTAN"} />
        <MetaText label="Port of Destination" value={[order.port_of_destination, order.final_destination].filter(Boolean).join("\n") || "-"} />
        <MetaText label="Shipped Per" value={order.shipped_per || order.shipping_type || "BY SEA"} />
        <MetaText label="VESSEL NAME & VOYAGE" value={[order.vessel_name, order.voyage_number].filter(Boolean).join(" / ") || " "} />
        <MetaText label="B/L NO." value={order.bl_number || " "} />
        <MetaText label="DATED" value={formatDate(order.bl_date) || " "} />
        <MetaText label="Shipping Marks & No(s)" value="Order:" />
        <MetaText label="Payment Term" value={order.payment_term || "OPEN ACCOUNT"} />
        <MetaText label="Sales Contract" value={order.sales_contract_number || order.invoice_number} />
        <MetaText label="Date of Issue" value={formatDate(order.valid_until || order.contract_date)} />
        <MetaText label="Container Number" value={order.container_number || "As Per Schedule"} />
      </section>

      <InvoiceItemsTable
        commercialItems={commercialItems}
        sampleItems={sampleItems}
        commercialCartons={commercialCartons}
        invoiceTotal={invoiceTotal}
        advanceAmount={advanceAmount}
        balanceAmount={balanceAmount}
        currency={order.currency || "USD"}
        isCustoms={isCustoms}
      />

      <section className="invoice-bottom">
        <div className="invoice-origin">
          <strong>"This is to Certify that Goods are of Pakistan Origin."</strong>
          {isCustoms && <span>(Rebate claim will be filed as per customs lab report under relevant export rebate claim)</span>}
        </div>
        <div className="invoice-weight-total">
          <span>Gross Weight :- (Kgs.)&nbsp;&nbsp;{compactNumber(Math.round(grossWeight))}</span>
          <span>Net Weight :- (Kgs.)&nbsp;&nbsp;{compactNumber(Math.round(netWeight))}</span>
        </div>
      </section>

      {!isCustoms && (
        <section className="invoice-authorized">
          <img src="/brand/signature-stamp.png" alt="Authorized signature and stamp" />
          <strong>Z.A Food Industries</strong>
          <span>Proprietor</span>
        </section>
      )}

      <footer className="invoice-footer">
        <img src="/brand/za-footer.png" alt="Z.A Food Industries contact details" />
      </footer>
    </div>
  );
}

function InvoiceItemsTable({ commercialItems, sampleItems, commercialCartons, invoiceTotal, advanceAmount, balanceAmount, currency, isCustoms }) {
  return (
    <table className={`invoice-table ${isCustoms ? "invoice-table-customs" : "invoice-table-client"}`}>
      <colgroup>
        <col className="invoice-col-qty" />
        <col className="invoice-col-desc" />
        {isCustoms && <col className="invoice-col-kgs" />}
        <col className="invoice-col-rate" />
        <col className="invoice-col-value" />
      </colgroup>
      <thead>
        <tr>
          <th>Quantity</th>
          <th>{isCustoms ? "Merchandise Description." : "Description of Goods"}</th>
          {isCustoms && <th></th>}
          <th>{isCustoms ? "Unit Price / Rate" : "Unit Price"}</th>
          <th>Value</th>
        </tr>
      </thead>
      <tbody>
        {commercialItems.length > 0 && (
          <tr className="invoice-group-row">
            <td></td>
            <td>{compactNumber(commercialCartons)} CARTONS OF CONFECTIONERY PRODUCTS</td>
            {isCustoms && <td>KGS.</td>}
            <td>CNF<br />COTONOU, BENIN</td>
            <td></td>
          </tr>
        )}
        {commercialItems.map((item) => <InvoiceLine key={item.id} item={item} currency={currency} isCustoms={isCustoms} />)}
        {sampleItems.length > 0 && (
          <tr className="invoice-sample-row"><td colSpan={isCustoms ? 5 : 4}>BELOW MENTIONED ITEMS ARE FOR SAMPLE PURPOSE ONLY HAVING NO COMMERCIAL VALUE</td></tr>
        )}
        {sampleItems.map((item) => (
          <tr key={item.id} className="invoice-sample-item">
            <td>{compactNumber(item.quantity)} {unitShortLabel(item.quantity_unit)}</td>
            <td className="invoice-description"><strong>{item.description_override || item.product_name}</strong><span>HS CODE: {item.hs_code || "-"}</span></td>
            {isCustoms && <td></td>}<td></td><td></td>
          </tr>
        ))}
        <tr className="invoice-total-row">
          <td colSpan={isCustoms ? 5 : 4}>
            <InvoiceTotals currency={currency} invoiceTotal={invoiceTotal} advanceAmount={advanceAmount} balanceAmount={balanceAmount} isCustoms={isCustoms} />
          </td>
        </tr>
      </tbody>
    </table>
  );
}

function InvoiceLine({ item, currency, isCustoms }) {
  const rate = isCustoms ? Number(item.customs_price_per_kg || 0) : Number(item.client_price_per_carton || 0);
  const value = invoiceLineValue(item, isCustoms);
  return (
    <tr>
      <td>{compactNumber(item.quantity)} {unitShortLabel(item.quantity_unit)}</td>
      <td className="invoice-description">
        <strong>{item.description_override || item.product_name}</strong>
        <span>{formatPackagingLine(item)}</span>
        <span>HS CODE: {item.hs_code || "-"}</span>
      </td>
      {isCustoms && <td>{number(item.total_net_weight)}</td>}
      <td>{currency}:&nbsp;&nbsp;{number(rate)} / {isCustoms ? "KGS" : unitShortLabel(item.quantity_unit)}</td>
      <td>{currency}:&nbsp;&nbsp;{decimalMoney(value)}</td>
    </tr>
  );
}

function InvoiceTotals({ currency, invoiceTotal, advanceAmount, balanceAmount, isCustoms }) {
  if (isCustoms) return <>TOTAL INVOICE VALUE&nbsp;&nbsp;{currency}: {decimalMoney(invoiceTotal)}</>;
  return (
    <div className="invoice-totals-box">
      <span>TOTAL INVOICE VALUE</span><strong>{currency}: {decimalMoney(invoiceTotal)}</strong>
      <span>LESS ADVANCE PAYMENT</span><strong>{currency}: {decimalMoney(advanceAmount)}</strong>
      <span>BALANCE INVOICE VALUE {currency}:</span><strong>{decimalMoney(balanceAmount)}</strong>
    </div>
  );
}

function PackingWeightListDocument({ order, documentType }) {
  const useCustomsConsignee = documentType === "customs_packing_list";
  const isClientPackingList = documentType === "client_packing_list";
  const consignee = useCustomsConsignee ? {
    name: order.customs_consignee_name,
    address: order.customs_consignee_address,
    city: order.customs_consignee_city,
    country: order.customs_consignee_country
  } : {
    name: order.client_name,
    address: order.client_address,
    city: order.client_city,
    country: order.client_country
  };
  const commercialItems = order.items.filter((item) => !item.is_sample);
  const sampleItems = order.items.filter((item) => item.is_sample);
  const commercialTotals = packingTotals(commercialItems);
  const sampleTotals = packingTotals(sampleItems);
  const grandTotals = packingTotals(order.items);
  const containerLabel = order.container_number || "As Per Schedule";

  return (
    <div className="print-document packing-sheet bg-white text-[#202020]">
      <header className="packing-brand"><img src="/brand/za-header.png" alt="Z.A Food Industries" /></header>
      <section className="packing-top">
        <div className="packing-consignee">
          <strong>{isClientPackingList ? "Applicant" : "CONSIGNEE"}</strong>
          <span>{consignee.name || "-"}</span>
          <span>{formatAddress(consignee.address, consignee.city, consignee.country)}</span>
        </div>
        <div className="packing-gd">G.D NO.</div>
        <div className="packing-title-block">
          <h1>{isClientPackingList ? "PACKING LIST" : "PACKING / WEIGHT LIST"}</h1>
          <InfoRows rows={[
            ["Our Reference No.", order.invoice_number],
            ["Dated", formatDate(order.contract_date)]
          ]} />
        </div>
      </section>

      <section className="packing-meta-grid">
        <MetaText label="From" value={order.port_of_loading || "KARACHI, PAKISTAN"} />
        <MetaText label={isClientPackingList ? "To" : "Port of Destination"} value={[order.port_of_destination, order.final_destination].filter(Boolean).join("\n") || "-"} />
        <MetaText label="Shipped Per" value={order.shipped_per || order.shipping_type || "BY SEA"} />
        <MetaText label="Shipping Marks & No(s)" value="Order" />
        {isClientPackingList && <MetaText label="B/L NUM" value={order.bl_number || " "} />}
        {isClientPackingList && <MetaText label="Dated" value={formatDate(order.bl_date) || " "} />}
        <MetaText label="Sales Contract" value={order.sales_contract_number || order.invoice_number} />
        <MetaText label="Date of Issue" value={formatDate(order.valid_until || order.contract_date)} />
        <MetaText label="Container Number" value={containerLabel} />
        {!isClientPackingList && <MetaText label="Packing" value="Export Standard Cartons Packing." wide />}
      </section>

      <h2 className="packing-section-title">PACKING / WEIGHT DETAILS</h2>
      <PackingDetailsTable commercialItems={commercialItems} sampleItems={sampleItems} commercialTotals={commercialTotals} sampleTotals={sampleTotals} isClientPackingList={isClientPackingList} />

      <PackingSummary containerLabel={containerLabel} commercialTotals={commercialTotals} sampleTotals={sampleTotals} grandTotals={grandTotals} isClientPackingList={isClientPackingList} />

      <section className="packing-origin">
        <strong>"This is to Certify that Goods are of Pakistan Origin."</strong>
        <span>(Rebate claim will be filed as per customs lab report under relevant export rebate claim)</span>
      </section>

      {isClientPackingList && (
        <section className="packing-authorized">
          <img src="/brand/signature-stamp.png" alt="Authorized signature and stamp" />
          <strong>Z.A Food Industries</strong>
          <span>Proprietor</span>
        </section>
      )}

      <footer className="packing-footer">
        <img src="/brand/za-footer.png" alt="Z.A Food Industries contact details" />
        <span>Page 1 of 1</span>
      </footer>
    </div>
  );
}

function PackingDetailsTable({ commercialItems, sampleItems, commercialTotals, sampleTotals, isClientPackingList }) {
  const commercialPouches = packingPouchTotal(commercialItems);
  const samplePouches = packingPouchTotal(sampleItems);
  return (
    <table className="packing-table">
      <colgroup>
        <col className="pack-col-serial" />
        <col className="pack-col-carton" />
        <col className="pack-col-desc" />
        <col className="pack-col-count" />
        <col className="pack-col-weight" />
        <col className="pack-col-weight" />
        <col className="pack-col-total" />
        <col className="pack-col-total" />
        <col className="pack-col-box" />
        <col className="pack-col-box-total" />
      </colgroup>
      <thead>
        <tr>
          <th>CARTON<br />NUMBER</th>
          <th></th>
          <th>DESCRIPTION<br />OF<br />GOODS</th>
          <th>NO. OF<br />TOTAL<br />CARTON</th>
          <th>NET.WT.<br />PER<br />CARTON</th>
          <th>GROSS<br />WT. PER<br />CARTON</th>
          <th>TOTAL<br />NET<br />WEIGHT</th>
          <th>TOTAL<br />GROSS<br />WEIGHT</th>
          <th>{isClientPackingList ? "POUCH" : "BOX"}<br />PER<br />CARTON</th>
          <th>TOTAL<br />JAR/BOX<br />POUCH</th>
        </tr>
      </thead>
      <tbody>
        {commercialItems.length > 0 && (
          <tr className="packing-group-row"><td colSpan="10">{compactNumber(commercialTotals.packages)} CARTONS OF CONFECTIONERY PRODUCTS</td></tr>
        )}
        {commercialItems.map((item, index) => <PackingLine key={item.id} item={item} index={index + 1} />)}
        {sampleItems.length > 0 && (
          <tr className="packing-sample-row"><td colSpan="10">BELOW MENTIONED ITEMS ARE FOR SAMPLE PURPOSE ONLY HAVING NO COMMERCIAL VALUE</td></tr>
        )}
        {sampleItems.map((item, index) => <PackingLine key={item.id} item={item} index={commercialItems.length + index + 1} />)}
        <tr className="packing-total-row">
          <td colSpan="3">T O T A L</td>
          <td>{compactNumber(commercialTotals.packages)}<br />{sampleTotals.packages ? compactNumber(sampleTotals.packages) : ""}</td>
          <td colSpan="2">{commercialTotals.unitLabel}<br />{sampleTotals.unitLabel}</td>
          <td>{number(commercialTotals.net)}<br />{sampleTotals.net ? number(sampleTotals.net) : ""}<br />KGS</td>
          <td>{number(commercialTotals.gross)}<br />{sampleTotals.gross ? number(sampleTotals.gross) : ""}<br />KGS</td>
          <td></td>
          <td>{compactNumber(commercialPouches)}<br />{samplePouches ? compactNumber(samplePouches) : ""}<br />{isClientPackingList ? "POUCH/BOX/JAR" : ""}</td>
        </tr>
      </tbody>
    </table>
  );
}

function PackingLine({ item, index }) {
  const cartons = Number(item.quantity || 0);
  const net = Number(item.total_net_weight || 0);
  const gross = Number(item.total_gross_weight || 0);
  const boxes = Number(packageDisplayCount(item) || item.units_per_carton || 0);
  return (
    <tr>
      <td>{index}</td>
      <td>{cartonRange(item)}</td>
      <td className="packing-description">
        <strong>{item.description_override || item.product_name}</strong>
        <span>{formatPackagingLine(item)}</span>
        <span>HS CODE: {item.hs_code || "-"}</span>
      </td>
      <td>{compactNumber(cartons)}</td>
      <td>{number(item.net_weight_per_carton)}</td>
      <td>{number(item.gross_weight_per_carton)}</td>
      <td>{number(net)}</td>
      <td>{number(gross)}</td>
      <td>{compactNumber(boxes)}</td>
      <td>{compactNumber(cartons * boxes)}</td>
    </tr>
  );
}

function PackingSummary({ containerLabel, commercialTotals, sampleTotals, grandTotals, isClientPackingList }) {
  return (
    <section className="packing-summary">
      <h2>SUMMERY OF PACKING / WEIGHT DETAILS</h2>
      <table>
        <thead>
          <tr>
            <th>CONTAINER NO.</th>
            <th>{isClientPackingList ? "T. CTNS" : "NO.OF CTNS"}</th>
            <th>NET.WT</th>
            <th>GROSS.WT</th>
            {isClientPackingList && <th>TOTAL JAR/BOX</th>}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{containerLabel}</td>
            <td rowSpan="2"><strong>GRAND TOTAL</strong></td>
            <td>{compactNumber(commercialTotals.packages)} {commercialTotals.unitLabel}<br />{sampleTotals.packages ? `${compactNumber(sampleTotals.packages)} ${sampleTotals.unitLabel}` : ""}</td>
            <td>{number(commercialTotals.net)}&nbsp;&nbsp;&nbsp;&nbsp;{number(commercialTotals.gross)}<br />{sampleTotals.net ? `${number(sampleTotals.net)}     ${number(sampleTotals.gross)}` : ""}</td>
            {isClientPackingList && <td>{compactNumber(grandTotals.pouches)}</td>}
          </tr>
          <tr>
            <td></td>
            <td>{number(grandTotals.net)}<br />KGS</td>
            <td>{number(grandTotals.gross)}<br />KGS</td>
            {isClientPackingList && <td></td>}
          </tr>
        </tbody>
      </table>
    </section>
  );
}

function GenericDocumentPreview({ order, preview }) {
  return (
    <div className="print-document rounded-xl border bg-white p-8">
      <div className="border-b-4 border-forest-800 pb-4 text-center"><h2 className="text-2xl font-black tracking-wide">Z.A FOOD INDUSTRIES</h2><p className="text-xs text-slate-500">Manufacturer & Exporter of Confectionery Products</p></div>
      <div className="my-8 text-center"><h1 className="text-xl font-black uppercase">{preview?.[1]}</h1><p className="mt-1 text-sm font-semibold">{order.invoice_number}</p></div>
      <div className="grid grid-cols-2 gap-6 text-sm"><Info label="Actual client / Notify party" value={order.client_name} /><Info label="Customs / B/L consignee" value={order.customs_consignee_name} /><Info label="Port of loading" value={order.port_of_loading || "-"} /><Info label="Destination" value={order.port_of_destination || "-"} /></div>
      <table className="mt-8 w-full border-collapse text-xs"><thead><tr className="bg-slate-100"><th className="border p-2 text-left">Description</th><th className="border p-2">Packages</th><th className="border p-2">Net Wt.</th><th className="border p-2">Gross Wt.</th></tr></thead><tbody>{order.items.map((item) => <tr key={item.id}><td className="border p-2">{item.product_name}{item.is_sample ? " (SAMPLE - NO COMMERCIAL VALUE)" : ""}</td><td className="border p-2 text-center">{item.quantity}</td><td className="border p-2 text-center">{item.total_net_weight}</td><td className="border p-2 text-center">{item.total_gross_weight}</td></tr>)}</tbody></table>
      <div className="mt-8 text-xs text-slate-500">This is to certify that goods are of Pakistan origin.</div>
    </div>
  );
}

function SalesContractDocument({ order }) {
  const commercialItems = order.items.filter((item) => !item.is_sample);
  const commercialTotals = {
    packages: commercialItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    net: commercialItems.reduce((sum, item) => sum + Number(item.total_net_weight || 0), 0),
    gross: commercialItems.reduce((sum, item) => sum + Number(item.total_gross_weight || 0), 0),
    client: commercialItems.reduce((sum, item) => sum + Number(item.client_value || 0), 0)
  };
  const advanceAmount = Number(commercialTotals.client) * (Number(order.advance_percentage) / 100);
  return (
    <div className="print-document sale-contract-sheet bg-white text-[#202020]">
      <header className="sale-brand"><img src="/brand/za-header.png" alt="Z.A Food Industries" /></header>
      <section className="sale-company">
        <strong>Your Trade Partner In Business</strong>
        <span>{company.address}</span>
        <span>{company.contact}</span>
      </section>
      <h1 className="sale-title">SALE CONTRACT</h1>
      <section className="sale-top-grid">
        <div className="sale-value-stack">
          <ContractValue label="Invoice Value" value={money(commercialTotals.client, order.currency)} />
          <ContractValue label={`Advance ${compactNumber(order.advance_percentage)}%`} value={money(advanceAmount, order.currency)} />
        </div>
        <div className="sale-invoice-box">
          <div className="sale-panel-title">Invoice Detail</div>
          <InfoRows rows={[
            ["Date", formatDate(order.contract_date)],
            ["Valid till", formatDate(order.valid_until)],
            ["Invoice #", order.sales_contract_number || order.invoice_number]
          ]} />
        </div>
      </section>
      <section className="sale-detail-grid">
        <DetailPanel title="Customer Detail" rows={[
          ["Name", order.client_name],
          ["Company Name", order.client_name],
          ["Address", formatAddress(order.client_address, order.client_city, order.client_country)],
          ["City / Country", [order.client_city, order.client_country].filter(Boolean).join(", ")],
          ["Email", "-"],
          ["Cell #", "-"]
        ]} />
        <DetailPanel title="Shipping Details" rows={[
          ["Container Type", order.container_type || "-"],
          ["Shipping Type", order.shipping_type || "-"],
          ["Port of Loading", order.port_of_loading || "-"],
          ["Port of Discharge", order.port_of_destination || "-"],
          ["Production Time", "45 DAYS"],
          ["Payment Terms", order.payment_term || "-"]
        ]} />
        <DetailPanel title="Container Detail" rows={[
          ["Container #", order.container_number || "As Per Schedule"],
          ["Loading Date", "As Per Schedule"],
          ["Total Cartons", compactNumber(commercialTotals.packages)],
          ["Cargo Net Weight", `${number(commercialTotals.net)} Per Container`],
          ["Cargo Gross Weight", `${number(commercialTotals.gross)} Per Container`],
          ["Tolerance", "10% +/-"]
        ]} />
      </section>
      <ProductTable order={order} items={commercialItems} />
      <section className="sale-lower-grid">
        <div>
          <DetailPanel title="Terms Of Sale" rows={company.terms.map((term, index) => [`${index + 1}.`, term])} compact />
          <DetailPanel title="Additional Details" rows={[
            ["Country of Origin", "Pakistan"],
            ["Port of Embarkation", order.port_of_loading || "Karachi, Pakistan"],
            ["Port of Discharge", order.port_of_destination || "-"],
            ["Reason for Export", "Sale"],
            ["I certify the above to be true and correct to the best of my knowledge.", ""]
          ]} compact />
          <div className="sale-signature">
            <img src="/brand/signature-stamp.png" alt="Authorized signature and stamp" />
            <span>AUTHORIZED SIGNATURE</span>
            <strong>Z.A FOOD INDUSTRIES, PAKISTAN</strong>
          </div>
        </div>
        <div>
          <DetailPanel title="Customer Instruction" rows={[[order.customer_instructions || "Freight (if any)", ""]]} compact />
          <DetailPanel title="Bank Detail" rows={company.bank} compact />
          <div className="sale-total-box">
            <span>Total</span>
            <strong>{money(commercialTotals.client, order.currency)}</strong>
            <small>Currency&nbsp;&nbsp;&nbsp;&nbsp;{order.currency || "USD"}</small>
          </div>
          <div className="sale-note">Note: Documents are checked as required by export office worksheet, given to Z.A. Food Industries official head account.</div>
        </div>
      </section>
    </div>
  );
}

function ProductTable({ order, items }) {
  const rows = items.map((item) => ({
    ...item,
    displayName: item.description_override || item.product_name,
    pcWeight: formatPieceWeight(item.product_unit_weight_grams),
    pieces: packagingDetails(item.product_packaging_details)?.pieces_per_box || item.units_per_carton,
    jarBox: packageDisplayCount(item),
    pkgType: item.product_package_type || item.quantity_unit || "CTN",
    unitPrice: Number(item.client_price_per_carton),
    total: Number(item.client_value)
  }));
  const totalCartons = rows.reduce((sum, item) => sum + Number(item.quantity), 0);
  const totalAmount = rows.reduce((sum, item) => sum + Number(item.total), 0);

  return (
    <section className="sale-product-wrap">
      <table className="sale-product-table">
        <colgroup>
          <col className="col-serial" />
          <col className="col-product" />
          <col className="col-container" />
          <col className="col-image" />
          <col className="col-pc-weight" />
          <col className="col-pieces" />
          <col className="col-jarbox" />
          <col className="col-pkg" />
          <col className="col-net" />
          <col className="col-gross" />
          <col className="col-qty" />
          <col className="col-price" />
          <col className="col-total" />
        </colgroup>
        <thead>
          <tr>
            <th rowSpan="2">S#</th>
            <th rowSpan="2">Product Name</th>
            <th rowSpan="2">Container</th>
            <th rowSpan="2"></th>
            <th colSpan="4">Product Details</th>
            <th colSpan="2">Carton Weight</th>
            <th rowSpan="2">Qty</th>
            <th rowSpan="2">Unit Price</th>
            <th rowSpan="2">Line Total</th>
          </tr>
          <tr>
            <th>PC<br />Weight</th>
            <th>No of<br />PCS</th>
            <th># of<br />Jar / Box</th>
            <th>Pkg<br />Type</th>
            <th>Net<br />Weight</th>
            <th>Gross<br />Weight</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((item, index) => (
            <tr key={item.id}>
              <td>{index + 1}</td>
              <td className="product-name">{item.displayName}</td>
              <td>{order.container_number || `CONTAINER-${index + 1}`}</td>
              <td className="product-image-cell">{item.product_image_url ? <img src={assetUrl(item.product_image_url)} alt="" /> : <div className="product-image-empty">{item.displayName}</div>}</td>
              <td>{item.pcWeight}</td>
              <td>{compactNumber(item.pieces)}</td>
              <td>{compactNumber(item.jarBox)}</td>
              <td>{item.pkgType}</td>
              <td><span className="boxed-weight">{number(item.net_weight_per_carton)}</span></td>
              <td><span className="boxed-weight">{number(item.gross_weight_per_carton)}</span></td>
              <td>{compactNumber(item.quantity)}</td>
              <td>{money(item.unitPrice, order.currency)}</td>
              <td>{money(item.total, order.currency)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td colSpan="10" className="grand-label">Grand Total:</td>
            <td>{compactNumber(totalCartons)}</td>
            <td></td>
            <td>{money(totalAmount, order.currency)}</td>
          </tr>
        </tfoot>
      </table>
    </section>
  );
}

function ContractValue({ label, value }) {
  return (
    <div className="contract-value">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function DetailPanel({ title, rows, compact = false }) {
  return (
    <section className={`sale-panel ${compact ? "sale-panel-compact" : ""}`}>
      <div className="sale-panel-title">{title}</div>
      <InfoRows rows={rows} />
    </section>
  );
}

function InfoRows({ rows }) {
  return (
    <table>
      <tbody>
        {rows.map(([label, value], index) => (
          <tr key={`${label}-${index}`}>
            <th>{label}</th>
            <td>{value || "-"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function MetaText({ label, value, wide = false }) {
  return (
    <div className={wide ? "packing-meta-wide" : ""}>
      <strong>{label}:</strong>
      <span>{value || "-"}</span>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold leading-5 text-ink">{value}</dd>
    </div>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label>
      <span className="label">{label}</span>
      <input className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function TextAreaField({ label, value, onChange, placeholder }) {
  return (
    <label>
      <span className="label">{label}</span>
      <textarea className="field min-h-24" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <label>
      <span className="label">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select...</option>
        {options.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
      </select>
    </label>
  );
}

function formatDate(value) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "2-digit" }).replace(/ /g, "-");
}

function formatAddress(...parts) {
  return parts.filter(Boolean).join(", ") || "-";
}

function cartonRange(item) {
  const unit = String(item.quantity_unit || "CARTON").toUpperCase();
  if (item.carton_start && item.carton_end) return `${compactNumber(item.carton_start)} TO ${compactNumber(item.carton_end)}`;
  return `1 TO ${compactNumber(item.quantity)}${unit.includes("BAG") ? " BAGS" : ""}`;
}

function sealList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    return String(value).split(/\r?\n|,/).map((seal) => seal.trim()).filter(Boolean);
  }
  return [];
}

function sealText(value) {
  return sealList(value).join("\n");
}

function fieldValue(value) {
  return value ?? "";
}

function packingTotals(items) {
  const unitCounts = items.reduce((counts, item) => {
    const label = unitLabel(item.quantity_unit);
    counts[label] = (counts[label] || 0) + Number(item.quantity || 0);
    return counts;
  }, {});
  const unitLabelText = Object.keys(unitCounts).join(" / ") || "";
  return {
    packages: items.reduce((sum, item) => sum + Number(item.quantity || 0), 0),
    net: items.reduce((sum, item) => sum + Number(item.total_net_weight || 0), 0),
    gross: items.reduce((sum, item) => sum + Number(item.total_gross_weight || 0), 0),
    pouches: packingPouchTotal(items),
    unitLabel: unitLabelText
  };
}

function packingPouchTotal(items) {
  return items.reduce((sum, item) => {
    const boxes = Number(packageDisplayCount(item) || item.units_per_carton || 0);
    return sum + Number(item.quantity || 0) * boxes;
  }, 0);
}

function unitLabel(value) {
  const unit = String(value || "CTN").toUpperCase();
  if (unit.includes("BAG")) return "BAGS";
  if (unit.includes("CTN") || unit.includes("CARTON")) return "CARTONS";
  return unit;
}

function unitShortLabel(value) {
  const unit = String(value || "CTN").toUpperCase();
  if (unit.includes("BAG")) return "BAGS";
  if (unit.includes("CTN") || unit.includes("CARTON")) return "CTN";
  return unit;
}

function compactNumber(value) {
  const numeric = Number(value || 0);
  return Number.isInteger(numeric) ? numeric.toLocaleString() : numeric.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function number(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function decimalMoney(value) {
  return Number(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function invoiceLineValue(item, isCustoms) {
  if (isCustoms) return Number(item.total_net_weight || 0) * Number(item.customs_price_per_kg || 0);
  return Number(item.client_value || 0);
}

function formatPieceWeight(value) {
  const grams = Number(value || 0);
  if (!grams) return "-";
  if (grams >= 1000) return `${compactNumber(grams / 1000)} KG`;
  return `${compactNumber(grams)} G`;
}

function formatPackagingLine(item) {
  const details = packagingDetails(item.product_packaging_details);
  if (!details) {
    return `${formatPieceWeight(item.product_unit_weight_grams)} X ${compactNumber(item.units_per_carton)} PIECES X ${compactNumber(item.product_pieces_per_unit)} ${item.product_package_type || item.quantity_unit || "JAR"}`;
  }

  const parts = [`${formatPieceWeight(item.product_unit_weight_grams)} X ${compactNumber(details.pieces_per_box)} PIECES`];
  if (["Pouch", "Jar", "Carton"].includes(item.product_package_type) && details.boxes_per_pouch) {
    parts.push(`${compactNumber(details.boxes_per_pouch)} BOX`);
  }
  if (["Jar", "Carton"].includes(item.product_package_type) && details.pouches_per_jar) {
    parts.push(`${compactNumber(details.pouches_per_jar)} POUCH`);
  }
  if (item.product_package_type === "Carton" && details.jars_per_carton) {
    parts.push(`${compactNumber(details.jars_per_carton)} JAR`);
  }
  parts.push(String(item.product_package_type || item.quantity_unit || "CARTON").toUpperCase());
  return parts.join(" X ");
}

function packagingDetails(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function packageDisplayCount(item) {
  const details = packagingDetails(item.product_packaging_details);
  if (!details) return item.product_pieces_per_unit;
  if (item.product_package_type === "Carton") return details.jars_per_carton;
  if (item.product_package_type === "Jar") return details.pouches_per_jar;
  if (item.product_package_type === "Pouch") return details.boxes_per_pouch;
  return item.product_pieces_per_unit || 1;
}

function money(value, currency = "USD") {
  const amount = Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 });
  return `${currency === "USD" ? "$" : `${currency} `}${amount}`;
}
