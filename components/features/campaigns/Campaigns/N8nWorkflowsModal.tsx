'use client';

import { useState } from 'react';
import { X, Copy, CheckCheck, Workflow, Zap, Bell, AlertTriangle } from 'lucide-react';

interface N8nWorkflowsModalProps {
  onClose: () => void;
}

// Workflow JSON strings — kept as plain strings to avoid TS template literal parsing
const WORKFLOW_1 = JSON.stringify({
  name: 'Festival Campaign Daily Sender',
  description: 'Runs daily. Fetches approved campaigns scheduled for today, sends WhatsApp image to all contacts, marks as executed.',
  schedule: 'Daily at 9:00 AM',
  nodes: [
    { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } } },
    { name: 'Fetch Approved Campaigns', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'GET', url: '={{$env.APP_URL}}/api/campaigns/create', queryParameters: { status: 'approved' } } },
    { name: 'Filter Todays Campaigns', type: 'n8n-nodes-base.code', parameters: { jsCode: "const today = new Date().toISOString().split('T')[0]; return items.filter(item => item.json.scheduled_at && item.json.scheduled_at.startsWith(today));" } },
    { name: 'Fetch Target Contacts', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'GET', url: '={{$env.APP_URL}}/api/contacts', queryParameters: { exclude_owners: 'true' } } },
    { name: 'Send WhatsApp Image', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'POST', url: 'https://graph.facebook.com/v18.0/={{$env.WHATSAPP_PHONE_NUMBER_ID}}/messages', body: { messaging_product: 'whatsapp', to: '={{$json.phone_number}}', type: 'image', image: { link: '={{$node.FilterTodaysCampaigns.json.image_url}}', caption: '={{$node.FilterTodaysCampaigns.json.message_template}}' } } } },
    { name: 'Mark Campaign Executed', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'PATCH', url: '={{$env.APP_URL}}/api/campaigns/update-status', body: { campaignId: '={{$node.FilterTodaysCampaigns.json.id}}', status: 'executed' } } },
  ],
}, null, 2);

const WORKFLOW_2 = JSON.stringify({
  name: 'Festival Campaign 3-Day Reminder',
  description: 'Runs every 3 days. Auto-promotes draft campaigns entering 3-month window. Sends owner WhatsApp summary grouped by quarter.',
  schedule: 'Every 3 days',
  nodes: [
    { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: { interval: [{ field: 'days', daysInterval: 3 }] } } },
    { name: 'Auto-Promote Draft to Pending', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'POST', url: '={{$env.APP_URL}}/api/campaigns/orchestrator', body: { action: 'promote_drafts' } } },
    { name: 'Fetch Pending and To-Be-Approved', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'GET', url: '={{$env.APP_URL}}/api/campaigns/create' } },
    {
      name: 'Build Reminder Message',
      type: 'n8n-nodes-base.code',
      parameters: {
        jsCode: [
          "const campaigns = items.map(i => i.json).filter(c => ['pending','to_be_approved'].includes(c.status));",
          "const grouped = { Q1: [], Q2: [], Q3: [], Q4: [] };",
          "campaigns.forEach(c => {",
          "  const m = new Date(c.scheduled_at).getMonth() + 1;",
          "  const q = m <= 3 ? 'Q1' : m <= 6 ? 'Q2' : m <= 9 ? 'Q3' : 'Q4';",
          "  const days = Math.round((new Date(c.scheduled_at) - new Date()) / 86400000);",
          "  const img = c.image_status === 'generated' ? 'Image Ready' : 'Image Not Ready';",
          "  const statusLabel = c.status === 'to_be_approved' ? 'Awaiting Approval' : 'Pending';",
          "  grouped[q].push(c.festival + ' — ' + days + ' days — ' + statusLabel + ' — ' + img);",
          "});",
          "let msg = '🎉 *Festival Campaign Reminder*\\n\\n';",
          "Object.entries(grouped).forEach(([q, list]) => {",
          "  if (list.length) msg += '*' + q + '*\\n' + list.join('\\n') + '\\n\\n';",
          "});",
          "return [{ json: { message: msg } }];",
        ].join('\n'),
      },
    },
    { name: 'Send Owner WhatsApp Reminder', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'POST', url: 'https://graph.facebook.com/v18.0/={{$env.WHATSAPP_PHONE_NUMBER_ID}}/messages', body: { messaging_product: 'whatsapp', to: '={{$env.OWNER_PHONE_NUMBER}}', type: 'text', text: { body: '={{$json.message}}' } } } },
  ],
}, null, 2);

const WORKFLOW_3 = JSON.stringify({
  name: 'Festival Campaign Overdue Checker',
  description: 'Runs daily. Finds campaigns past their scheduled date without approval, marks them overdue, alerts owner via WhatsApp.',
  schedule: 'Daily at 8:00 AM',
  nodes: [
    { name: 'Schedule Trigger', type: 'n8n-nodes-base.scheduleTrigger', parameters: { rule: { interval: [{ field: 'days', daysInterval: 1 }] } } },
    { name: 'Fetch All Campaigns', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'GET', url: '={{$env.APP_URL}}/api/campaigns/create' } },
    { name: 'Find Overdue Campaigns', type: 'n8n-nodes-base.code', parameters: { jsCode: "const today = new Date(); return items.filter(item => { const c = item.json; if (!c.scheduled_at) return false; return new Date(c.scheduled_at) <= today && !['approved','executed','overdue'].includes(c.status); });" } },
    { name: 'Mark Overdue', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'PATCH', url: '={{$env.APP_URL}}/api/campaigns/update-status', body: { campaignId: '={{$json.id}}', status: 'overdue' } } },
    { name: 'Send Overdue Alert to Owner', type: 'n8n-nodes-base.httpRequest', parameters: { method: 'POST', url: 'https://graph.facebook.com/v18.0/={{$env.WHATSAPP_PHONE_NUMBER_ID}}/messages', body: { messaging_product: 'whatsapp', to: '={{$env.OWNER_PHONE_NUMBER}}', type: 'text', text: { body: '⚠️ *Overdue Campaign Alert*\n\nCampaign *={{$json.festival}}* scheduled for ={{$json.scheduled_at}} has passed without approval. Status updated to OVERDUE.' } } } },
  ],
}, null, 2);

interface WorkflowCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  schedule: string;
  json: string;
}

function WorkflowCard({ icon, title, description, schedule, json }: WorkflowCardProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(json);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-4 bg-slate-50 border-b border-slate-200">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white rounded-lg border border-slate-200 text-slate-600">
              {icon}
            </div>
            <div>
              <h4 className="font-semibold text-slate-900 text-sm">{title}</h4>
              <p className="text-xs text-slate-500 mt-0.5">{description}</p>
            </div>
          </div>
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap font-medium">
            {schedule}
          </span>
        </div>
      </div>
      <div className="relative">
        <pre className="text-xs bg-slate-900 text-green-400 p-4 overflow-x-auto max-h-48 font-mono leading-relaxed">
          {json}
        </pre>
        <button
          onClick={handleCopy}
          className="absolute top-2 right-2 flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs rounded-lg transition-colors"
        >
          {copied ? (
            <>
              <CheckCheck className="w-3.5 h-3.5" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              Copy JSON
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export function N8nWorkflowsModal({ onClose }: N8nWorkflowsModalProps) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-xl">
              <Workflow className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">n8n Workflow Templates</h2>
              <p className="text-sm text-slate-500">Copy and import these into your n8n instance</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <WorkflowCard icon={<Zap className="w-4 h-4" />} title="Workflow 1 — Daily Campaign Sender" description="Fetches approved campaigns scheduled for today, sends WhatsApp image to all contacts, marks as executed." schedule="Daily at 9:00 AM" json={WORKFLOW_1} />
          <WorkflowCard icon={<Bell className="w-4 h-4" />} title="Workflow 2 — 3-Day Reminder" description="Auto-promotes draft→pending campaigns entering 3-month window. Sends owner WhatsApp summary grouped by quarter." schedule="Every 3 days" json={WORKFLOW_2} />
          <WorkflowCard icon={<AlertTriangle className="w-4 h-4" />} title="Workflow 3 — Overdue Checker" description="Finds campaigns past their scheduled date without approval, marks them overdue, alerts owner via WhatsApp." schedule="Daily at 8:00 AM" json={WORKFLOW_3} />

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h4 className="font-semibold text-amber-800 text-sm mb-2">Setup Instructions</h4>
            <ol className="text-xs text-amber-700 space-y-1 list-decimal list-inside">
              <li>Copy the JSON above and import it in n8n (Workflows → Import from JSON)</li>
              <li>Set environment variables: <code className="bg-amber-100 px-1 rounded">APP_URL</code>, <code className="bg-amber-100 px-1 rounded">OWNER_PHONE_NUMBER</code>, <code className="bg-amber-100 px-1 rounded">WHATSAPP_PHONE_NUMBER_ID</code></li>
              <li>Add WhatsApp credentials in n8n (Header Auth with Bearer token)</li>
              <li>Activate each workflow and test with a single campaign</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}
