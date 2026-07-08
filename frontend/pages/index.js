import { useState, useEffect, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

function StatusBadge({ status }) {
  const map = {
    success: { bg: '#0a3622', color: '#00ff4f', icon: '✅' },
    completed: { bg: '#0a3622', color: '#00ff4f', icon: '✅' },
    pending: { bg: '#1a2a3a', color: '#60a5fa', icon: '⏳' },
    running: { bg: '#1a2a3a', color: '#60a5fa', icon: '🔄' },
    failed: { bg: '#3a1a1a', color: '#ef4444', icon: '❌' },
    error: { bg: '#3a1a1a', color: '#ef4444', icon: '❌' },
  };
  const s = map[(status || '').toLowerCase()] || { bg: '#1a2436', color: '#94a3b8', icon: '•' };
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        background: s.bg,
        color: s.color,
        padding: '2px 8px',
        borderRadius: '10px',
        fontSize: '11px',
        fontWeight: 600,
      }}
    >
      {s.icon} {status || 'unknown'}
    </span>
  );
}

export default function Home() {
  // ── Chat state ──
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  // ── Workflow state ──
  const [activeTab, setActiveTab] = useState('chat');
  const [workflows, setWorkflows] = useState([]);
  const [wfLoading, setWfLoading] = useState(false);
  const [wfError, setWfError] = useState('');
  const [expandedWf, setExpandedWf] = useState(null);
  const [execStatuses, setExecStatuses] = useState({}); // slug -> { execution_id, status, output }
  const [execLoading, setExecLoading] = useState({});

  // ── Confirmation modal state ──
  const [showConfirm, setShowConfirm] = useState(false);
  const [confirmIntent, setConfirmIntent] = useState('');

  // ── Mobile detection ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Chat: send command → show confirmation modal ──
  const sendCommand = () => {
    if (!message.trim()) return;
    setConfirmIntent(message);
    setShowConfirm(true);
  };

  // ── Chat: confirm and execute ──
  const confirmAndSend = async () => {
    setShowConfirm(false);
    const msg = confirmIntent;
    setConfirmIntent('');
    setMessage('');
    if (!msg.trim()) return;

    setLoading(true);
    const userMsg = { role: 'user', content: msg };
    setHistory((prev) => [...prev, userMsg]);

    try {
      const res = await fetch(`${API_URL}/api/command`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMsg.content }),
      });
      const data = await res.json();

      const botMsg = {
        role: 'assistant',
        content: data.explanation || data.intent || (data.success ? 'Workflow created!' : ` ${data.error}`),
        data,
      };
      setHistory((prev) => [...prev, botMsg]);

      // Track execution status if we got an execution_id
      if (data.execution_id && data.workflow_slug) {
        setExecStatuses((prev) => ({
          ...prev,
          [data.workflow_slug]: {
            execution_id: data.execution_id,
            status: data.status || 'pending',
            output: data.output || null,
          },
        }));
      }
    } catch (err) {
      setHistory((prev) => [
        ...prev,
        { role: 'assistant', content: ` Error: ${err.message}` },
      ]);
    }
    setLoading(false);
  };

  // ── Chat: cancel confirmation ──
  const cancelSend = () => {
    setShowConfirm(false);
    setConfirmIntent('');
  };

  // ── Workflows: load list ──
  const loadWorkflows = useCallback(async () => {
    setWfLoading(true);
    setWfError('');
    try {
      const res = await fetch(`${API_URL}/api/workflows`);
      const data = await res.json();
      setWorkflows(data.workflows || []);
    } catch (err) {
      setWfError(`Failed to load workflows: ${err.message}`);
    }
    setWfLoading(false);
  }, []);

  useEffect(() => {
    if (activeTab === 'workflows') loadWorkflows();
  }, [activeTab, loadWorkflows]);

  // ── Workflows: trigger ──
  const triggerWorkflow = async (slug) => {
    setExecLoading((prev) => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`${API_URL}/api/workflows/${slug}/trigger`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success && data.result) {
        setExecStatuses((prev) => ({
          ...prev,
          [slug]: {
            execution_id: data.result.executionId || data.result.execution_id || '-',
            status: data.result.status || 'pending',
            output: data.result.output || null,
          },
        }));
      } else {
        setExecStatuses((prev) => ({
          ...prev,
          [slug]: { execution_id: '-', status: 'error', output: data.detail || 'Trigger failed' },
        }));
      }
    } catch (err) {
      setExecStatuses((prev) => ({
        ...prev,
        [slug]: { execution_id: '-', status: 'error', output: err.message },
      }));
    }
    setExecLoading((prev) => ({ ...prev, [slug]: false }));
  };

  // ── Workflows: check status ──
  const checkStatus = async (slug) => {
    const current = execStatuses[slug];
    if (!current?.execution_id) return;
    setExecLoading((prev) => ({ ...prev, [slug]: true }));
    try {
      const res = await fetch(`${API_URL}/api/workflows/${current.execution_id}/status`);
      const data = await res.json();
      setExecStatuses((prev) => ({
        ...prev,
        [slug]: {
          execution_id: current.execution_id,
          status: data.status || current.status,
          output: data.output || data.result || current.output,
        },
      }));
    } catch (err) {
      // keep current status on error
    }
    setExecLoading((prev) => ({ ...prev, [slug]: false }));
  };

  // ── Examples ──
  const examples = [
    'Supply 0.01 ETH to Aave V3 on Sepolia',
    'Create a workflow to auto-compound my Spark rewards every hour',
    'Swap 10 USDC to ETH on Uniswap when gas is low',
    'Monitor my Morpho position and alert me if health factor drops below 1.5',
  ];

  const tabStyle = (tab) => ({
    padding: isMobile ? '8px 16px' : '10px 24px',
    background: activeTab === tab ? '#00ff4f' : 'transparent',
    color: activeTab === tab ? '#0a0e17' : '#94a3b8',
    border: activeTab === tab ? 'none' : '1px solid #1e293b',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: isMobile ? '13px' : '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  });

  return (
    <div style={styles.container}>
      {/* Global responsive styles */}
      <style jsx global>{`
        @media (max-width: 767px) {
          .hide-mobile { display: none !important; }
        }
      `}</style>

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.logo}>
          <span style={styles.logoIcon}> </span>
          <h1 style={styles.title}>YieldFarmer AI</h1>
        </div>
        <span style={styles.badge}>Powered by KeeperHub</span>
      </header>

      {/* Tab bar */}
      <div style={styles.tabBar}>
        <button style={tabStyle('chat')} onClick={() => setActiveTab('chat')}>
           Chat
        </button>
        <button style={tabStyle('workflows')} onClick={() => setActiveTab('workflows')}>
           Workflows
        </button>
      </div>

      {/* Main content */}
      <main style={styles.main}>
        {activeTab === 'chat' ? (
          <>
            {/* Chat Area */}
            <div style={styles.chatArea}>
              {history.length === 0 ? (
                <div style={styles.welcome}>
                  <h2 style={styles.welcomeTitle}>Your DeFi Automation Agent</h2>
                  <p style={styles.welcomeText}>
                    Tell me what you want to do in DeFi, and I'll create and execute
                    the KeeperHub workflow for you.
                  </p>
                  <div style={styles.examples}>
                    <p style={styles.examplesLabel}>Try these:</p>
                    {examples.map((ex, i) => (
                      <button
                        key={i}
                        style={styles.exampleBtn}
                        onClick={() => setMessage(ex)}
                      >
                        {ex}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                history.map((msg, i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.message,
                      ...(msg.role === 'user' ? styles.userMsg : styles.botMsg),
                    }}
                  >
                    <strong>{msg.role === 'user' ? 'You' : '  Agent'}:</strong>
                    <p style={styles.msgText}>{msg.content}</p>

                    {/* Execution details inline */}
                    {msg.data?.execution_id && (
                      <div style={styles.execCard}>
                        <div style={styles.execRow}>
                          <span style={styles.execLabel}>Execution</span>
                          <code style={styles.execId}>{msg.data.execution_id}</code>
                        </div>
                        <div style={styles.execRow}>
                          <span style={styles.execLabel}>Status</span>
                          <StatusBadge status={msg.data.status} />
                        </div>
                        {msg.data.output && (
                          <div style={styles.execRow}>
                            <span style={styles.execLabel}>Output</span>
                            <code style={styles.execOutput}>
                              {typeof msg.data.output === 'object'
                                ? JSON.stringify(msg.data.output, null, 2)
                                : String(msg.data.output)}
                            </code>
                          </div>
                        )}
                      </div>
                    )}

                    {msg.data?.workflow_slug && !msg.data?.execution_id && (
                      <code style={styles.wfId}>
                        Workflow: {msg.data.workflow_slug}
                      </code>
                    )}
                  </div>
                ))
              )}
              {loading && (
                <div style={{ ...styles.message, ...styles.botMsg }}>
                  <strong>  Agent:</strong>
                  <p style={styles.msgText}>Thinking...</p>
                </div>
              )}
            </div>

            {/* Input */}
            <div style={styles.inputArea}>
              <input
                style={styles.input}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && sendCommand()}
                placeholder="e.g., Supply 0.01 ETH to Aave on Sepolia..."
                disabled={loading}
              />
              <button
                style={styles.sendBtn}
                onClick={sendCommand}
                disabled={loading || !message.trim()}
              >
                {loading ? ' ' : 'Send'}
              </button>
            </div>
          </>
        ) : (
          <>
            {/* Workflow list */}
            <div style={styles.wfHeader}>
              <h2 style={styles.wfTitle}>Available Workflows</h2>
              <button style={styles.refreshBtn} onClick={loadWorkflows} disabled={wfLoading}>
                {wfLoading ? 'Loading...' : ' Refresh'}
              </button>
            </div>

            {wfError && <div style={styles.wfError}>{wfError}</div>}

            <div style={styles.chatArea}>
              {wfLoading && workflows.length === 0 ? (
                <div style={styles.welcome}>
                  <p style={styles.welcomeText}>Loading workflows...</p>
                </div>
              ) : workflows.length === 0 && !wfLoading ? (
                <div style={styles.welcome}>
                  <p style={styles.welcomeText}>
                    No workflows available. Make sure the backend is running at {API_URL}
                  </p>
                </div>
              ) : (
                workflows.map((wf, i) => {
                  const slug = wf.listedSlug || wf.slug || wf.id || `wf-${i}`;
                  const status = execStatuses[slug];
                  const isLoading = execLoading[slug];
                  const isExpanded = expandedWf === slug;

                  return (
                    <div key={slug} style={styles.wfCard}>
                      {/* Card header */}
                      <div
                        style={styles.wfCardHeader}
                        onClick={() => setExpandedWf(isExpanded ? null : slug)}
                      >
                        <div style={styles.wfCardLeft}>
                          <span style={styles.wfName}>{wf.name || slug}</span>
                          <code style={styles.wfSlug}>{slug}</code>
                          {wf.workflowType && (
                            <span style={{
                              ...styles.wfType,
                              ...(wf.workflowType === 'write' ? styles.wfTypeWrite : styles.wfTypeRead),
                            }}>
                              {wf.workflowType}
                            </span>
                          )}
                          {status && <StatusBadge status={status.status} />}
                        </div>
                        <span style={styles.expandIcon}>{isExpanded ? ' ' : ' '}</span>
                      </div>

                      {/* Card body (expandable) */}
                      {isExpanded && (
                        <div style={styles.wfCardBody}>
                          {wf.description && (
                            <p style={styles.wfDesc}>{wf.description}</p>
                          )}

                          {/* Input Schema */}
                          {wf.inputSchema && Object.keys(wf.inputSchema).length > 0 && (
                            <div style={styles.schemaSection}>
                              <span style={styles.schemaLabel}> Input Schema</span>
                              <pre style={styles.schemaContent}>
                                {JSON.stringify(wf.inputSchema, null, 2)}
                              </pre>
                            </div>
                          )}

                          <div style={styles.wfActions}>
                            <button
                              style={styles.triggerBtn}
                              onClick={() => triggerWorkflow(slug)}
                              disabled={isLoading}
                            >
                              {isLoading ? 'Running...' : ' Trigger'}
                            </button>
                            {status?.execution_id && (
                              <button
                                style={styles.statusBtn}
                                onClick={() => checkStatus(slug)}
                                disabled={isLoading}
                              >
                                 Refresh Status
                              </button>
                            )}
                          </div>

                          {/* Execution status details */}
                          {status && (
                            <div style={styles.execCard}>
                              <div style={styles.execRow}>
                                <span style={styles.execLabel}>Execution ID</span>
                                <code style={styles.execId}>{status.execution_id}</code>
                              </div>
                              <div style={styles.execRow}>
                                <span style={styles.execLabel}>Status</span>
                                <StatusBadge status={status.status} />
                              </div>
                              {status.output && (
                                <div style={styles.execRow}>
                                  <span style={styles.execLabel}>Output</span>
                                  <code style={styles.execOutput}>
                                    {typeof status.output === 'object'
                                      ? JSON.stringify(status.output, null, 2)
                                      : String(status.output)}
                                  </code>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </>
        )}
      </main>

      {/* ── Transaction Confirmation Modal ── */}
      {showConfirm && (
        <div style={styles.modalBackdrop} onClick={cancelSend}>
          <div style={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <span style={styles.modalIcon}>⚡</span>
              <h3 style={styles.modalTitle}>确认执行</h3>
            </div>

            <div style={styles.modalBody}>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>即将执行</span>
                <span style={styles.modalValue}>{confirmIntent}</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>Workflow</span>
                <span style={styles.modalHint}>点击确认后将自动匹配最佳工作流</span>
              </div>
              <div style={styles.modalRow}>
                <span style={styles.modalLabel}>预估参数</span>
                <span style={styles.modalHint}>由 AI 自动解析</span>
              </div>
            </div>

            <div style={styles.modalActions}>
              <button style={styles.modalCancelBtn} onClick={cancelSend}>
                取消
              </button>
              <button style={styles.modalConfirmBtn} onClick={confirmAndSend}>
                确认执行
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

// ── Styles ──
const styles = {
  // ── Layout ──
  container: {
    minHeight: '100vh',
    background: '#0a0e17',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    display: 'flex',
    flexDirection: 'column',
  },

  // ── Header ──
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    borderBottom: '1px solid #1a2436',
    background: '#0d1320',
    flexWrap: 'wrap',
    gap: '8px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: { fontSize: '24px' },
  title: { fontSize: '18px', fontWeight: 700, color: '#00ff4f', margin: 0 },
  badge: {
    background: '#1a2436',
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    color: '#7a9ca8',
    whiteSpace: 'nowrap',
  },

  // ── Tab bar ──
  tabBar: {
    display: 'flex',
    gap: '8px',
    padding: '12px 20px',
    borderBottom: '1px solid #1a2436',
    background: '#0a0e17',
  },

  // ── Main ──
  main: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
    padding: '20px',
  },
  chatArea: { flex: 1, overflowY: 'auto', marginBottom: '16px' },

  // ── Welcome ──
  welcome: { textAlign: 'center', paddingTop: '40px' },
  welcomeTitle: { fontSize: '24px', color: '#fff', marginBottom: '10px' },
  welcomeText: { color: '#7a9ca8', fontSize: '15px', marginBottom: '24px' },
  examples: { textAlign: 'left', maxWidth: '500px', margin: '0 auto' },
  examplesLabel: { color: '#7a9ca8', fontSize: '12px', marginBottom: '8px' },
  exampleBtn: {
    display: 'block',
    width: '100%',
    textAlign: 'left',
    background: '#111827',
    border: '1px solid #1e293b',
    color: '#94a3b8',
    padding: '10px 14px',
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'border-color 0.2s',
  },

  // ── Messages ──
  message: {
    padding: '12px 16px',
    borderRadius: '12px',
    marginBottom: '12px',
    maxWidth: '90%',
  },
  userMsg: { background: '#1a3a2a', alignSelf: 'flex-end', marginLeft: 'auto' },
  botMsg: { background: '#111827', border: '1px solid #1e293b' },
  msgText: { margin: '6px 0 0 0', lineHeight: 1.5, wordBreak: 'break-word' },
  wfId: {
    display: 'inline-block',
    marginTop: '8px',
    background: '#0d1320',
    padding: '3px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#00ff4f',
    fontFamily: 'monospace',
  },

  // ── Execution card (used in chat + workflows) ──
  execCard: {
    marginTop: '10px',
    background: '#0d1320',
    border: '1px solid #1a2436',
    borderRadius: '8px',
    padding: '10px 12px',
  },
  execRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  execLabel: {
    color: '#7a9ca8',
    fontSize: '11px',
    fontWeight: 600,
    minWidth: '60px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  execId: {
    background: '#111827',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#60a5fa',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    flex: 1,
  },
  execOutput: {
    background: '#111827',
    padding: '8px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#94a3b8',
    fontFamily: 'monospace',
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
    maxHeight: '200px',
    overflowY: 'auto',
    flex: 1,
    display: 'block',
  },

  // ── Input ──
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '14px',
    background: '#0d1320',
    borderRadius: '12px',
    border: '1px solid #1a2436',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#e0e0e0',
    fontSize: '15px',
    outline: 'none',
    minWidth: 0,
  },
  sendBtn: {
    background: '#00ff4f',
    color: '#0a0e17',
    border: 'none',
    padding: '10px 20px',
    borderRadius: '8px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    transition: 'opacity 0.2s',
  },

  // ── Workflows tab ──
  wfHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  wfTitle: { fontSize: '18px', color: '#fff', margin: 0 },
  refreshBtn: {
    background: '#1a2436',
    color: '#94a3b8',
    border: '1px solid #1e293b',
    padding: '6px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s',
  },
  wfError: {
    background: '#3a1a1a',
    color: '#ef4444',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
  },

  // ── Workflow cards ──
  wfCard: {
    background: '#111827',
    border: '1px solid #1e293b',
    borderRadius: '10px',
    marginBottom: '10px',
    overflow: 'hidden',
    transition: 'border-color 0.2s',
  },
  wfCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 14px',
    cursor: 'pointer',
    userSelect: 'none',
  },
  wfCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexWrap: 'wrap',
    flex: 1,
    minWidth: 0,
  },
  wfName: {
    color: '#e0e0e0',
    fontWeight: 600,
    fontSize: '14px',
  },
  wfType: {
    background: '#1a2436',
    color: '#7a9ca8',
    padding: '1px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
  },
  expandIcon: {
    color: '#7a9ca8',
    fontSize: '12px',
    marginLeft: '8px',
    flexShrink: 0,
  },

  wfCardBody: {
    padding: '0 14px 14px',
    borderTop: '1px solid #1e293b',
    marginTop: '0',
    paddingTop: '12px',
  },
  wfDesc: {
    color: '#7a9ca8',
    fontSize: '13px',
    margin: '0 0 12px 0',
    lineHeight: 1.5,
  },
  wfActions: {
    display: 'flex',
    gap: '8px',
    marginBottom: '12px',
    flexWrap: 'wrap',
  },
  triggerBtn: {
    background: '#00ff4f',
    color: '#0a0e17',
    border: 'none',
    padding: '6px 16px',
    borderRadius: '6px',
    fontWeight: 700,
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'opacity 0.2s',
  },
  statusBtn: {
    background: '#1a2436',
    color: '#60a5fa',
    border: '1px solid #1e293b',
    padding: '6px 14px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    transition: 'all 0.2s',
  },

  // ── Confirmation modal ──
  modalBackdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0, 0, 0, 0.75)',
    backdropFilter: 'blur(6px)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modalCard: {
    background: 'rgba(17, 24, 39, 0.95)',
    backdropFilter: 'blur(20px)',
    border: '1px solid rgba(0, 255, 79, 0.2)',
    borderRadius: '16px',
    padding: '24px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5), 0 0 40px rgba(0, 255, 79, 0.05)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    paddingBottom: '14px',
    borderBottom: '1px solid rgba(30, 41, 59, 0.6)',
  },
  modalIcon: { fontSize: '24px' },
  modalTitle: {
    color: '#00ff4f',
    fontSize: '18px',
    fontWeight: 700,
    margin: 0,
  },
  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
    marginBottom: '20px',
  },
  modalRow: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  modalLabel: {
    color: '#7a9ca8',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  modalValue: {
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: 500,
    background: '#0d1320',
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #1e293b',
    lineHeight: 1.4,
  },
  modalHint: {
    color: '#64748b',
    fontSize: '13px',
    fontStyle: 'italic',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    paddingTop: '16px',
    borderTop: '1px solid rgba(30, 41, 59, 0.6)',
  },
  modalCancelBtn: {
    background: '#1a2436',
    color: '#94a3b8',
    border: '1px solid #1e293b',
    padding: '10px 20px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s',
  },
  modalConfirmBtn: {
    background: '#00ff4f',
    color: '#0a0e17',
    border: 'none',
    padding: '10px 24px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 700,
    transition: 'opacity 0.2s',
  },

  // ── Workflow slug badge ──
  wfSlug: {
    background: '#0d1320',
    color: '#00ff4f',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontFamily: 'monospace',
  },

  // ── Workflow type badge variants ──
  wfTypeRead: {
    background: '#0a2a1a',
    color: '#00ff4f',
    border: '1px solid rgba(0, 255, 79, 0.3)',
  },
  wfTypeWrite: {
    background: '#2a1a0a',
    color: '#f59e0b',
    border: '1px solid rgba(245, 158, 11, 0.3)',
  },

  // ── Input Schema section ──
  schemaSection: {
    marginBottom: '12px',
  },
  schemaLabel: {
    color: '#7a9ca8',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    display: 'block',
    marginBottom: '6px',
  },
  schemaContent: {
    background: '#0d1320',
    border: '1px solid #1e293b',
    borderRadius: '6px',
    padding: '10px 12px',
    fontSize: '12px',
    color: '#94a3b8',
    fontFamily: 'monospace',
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
    maxHeight: '200px',
    overflowY: 'auto',
    margin: 0,
    lineHeight: 1.5,
  },
};
