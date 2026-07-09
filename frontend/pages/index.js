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
  const [matchedSlug, setMatchedSlug] = useState('');
  const [matchingWorkflow, setMatchingWorkflow] = useState(false);
  const [matchedWorkflowName, setMatchedWorkflowName] = useState('');

  // ── Strategies & Yields state ──
  const [strategies, setStrategies] = useState([]);
  const [yields, setYields] = useState([]);
  const [yieldsLoading, setYieldsLoading] = useState(true);
  const [yieldsError, setYieldsError] = useState('');

  // ── Dynamic examples (initial fallback, replaced by workflow slugs) ──
  const [examples, setExamples] = useState([
    'Supply 0.01 ETH to Aave V3 on Sepolia',
    'Create a workflow to auto-compound my Spark rewards every hour',
    'Swap 10 USDC to ETH on Uniswap when gas is low',
    'Monitor my Morpho position and alert me if health factor drops below 1.5',
  ]);

  // ── Mobile detection ──
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  // ── Fetch strategies, yields, and dynamic examples on mount ──
  useEffect(() => {
    fetch(`${API_URL}/api/strategies`)
      .then((res) => res.json())
      .then((data) => setStrategies(data.strategies || []))
      .catch(() => {});

    setYieldsLoading(true);
    fetch(`${API_URL}/api/yields`)
      .then((res) => res.json())
      .then((data) => setYields(data.protocols || []))
      .catch(() => setYieldsError('Failed to load yields'))
      .finally(() => setYieldsLoading(false));

    fetch(`${API_URL}/api/workflows`)
      .then((res) => res.json())
      .then((data) => {
        const wfs = data.workflows || [];
        if (wfs.length > 0) {
          const slugs = wfs
            .slice(0, 4)
            .map((wf) => wf.listedSlug || wf.slug)
            .filter(Boolean);
          if (slugs.length > 0) setExamples(slugs);
        }
      })
      .catch(() => {});
  }, []);

  // ── Chat: send command → match workflow → show confirmation modal ──
  const sendCommand = async () => {
    if (!message.trim()) return;

    setMatchingWorkflow(true);
    let bestSlug = '';
    let bestName = '';
    try {
      const res = await fetch(`${API_URL}/api/workflows`);
      const data = await res.json();
      const wfs = data.workflows || [];
      const msgLower = message.toLowerCase();
      // Exact slug match first
      for (const wf of wfs) {
        const slug = wf.listedSlug || wf.slug || '';
        if (slug && msgLower.includes(slug.toLowerCase())) {
          bestSlug = slug;
          bestName = wf.name || slug;
          break;
        }
      }
      // Name match fallback
      if (!bestSlug) {
        for (const wf of wfs) {
          const name = wf.name || '';
          if (name && msgLower.includes(name.toLowerCase())) {
            bestSlug = wf.listedSlug || wf.slug || '';
            bestName = name;
            break;
          }
        }
      }
    } catch (_) {}
    setMatchingWorkflow(false);

    setMatchedSlug(bestSlug);
    setMatchedWorkflowName(bestName);
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
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Inter', system-ui, -apple-system, sans-serif; }
        @media (max-width: 767px) {
          .hide-mobile { display: none !important; }
        }
        @keyframes pulse-skeleton {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
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
              {history.length > 0 && (
                <div style={styles.chatHeaderRow}>
                  <button
                    style={styles.clearChatBtn}
                    onClick={() => {
                      setHistory([]);
                      setMessage('');
                    }}
                  >
                    清空对话
                  </button>
                </div>
              )}
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
                <div style={styles.skeletonGroup}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={styles.skeletonCard}>
                      <div style={{ ...styles.skeletonLine, width: '70%' }} />
                      <div style={{ ...styles.skeletonLine, width: '50%' }} />
                      <div style={{ ...styles.skeletonLine, width: '85%' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Strategies Selector */}
            {strategies.length > 0 && (
              <div style={styles.strategiesRow}>
                {strategies.map((s, i) => (
                  <button
                    key={s.key || i}
                    style={styles.strategyPill}
                    onClick={() => setMessage(s.name || s.key)}
                    title={s.description || ''}
                  >
                    {s.name || s.key}
                  </button>
                ))}
              </div>
            )}

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
                <div style={styles.skeletonGroup}>
                  {[1, 2, 3].map((i) => (
                    <div key={i} style={styles.skeletonCard}>
                      <div style={{ ...styles.skeletonLine, width: '60%' }} />
                      <div style={{ ...styles.skeletonLine, width: '40%' }} />
                      <div style={{ ...styles.skeletonLine, width: '80%' }} />
                    </div>
                  ))}
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

            {/* Yield Comparison */}
            <div style={styles.yieldsSection}>
              <h3 style={styles.yieldsTitle}> Yield Comparison</h3>
              {yieldsError ? (
                <p style={styles.wfError}>{yieldsError}</p>
              ) : yieldsLoading ? (
                <p style={styles.welcomeText}>正在加载收益数据...</p>
              ) : yields.length === 0 ? (
                <p style={styles.welcomeText}>暂无收益数据</p>
              ) : (
                <div style={styles.yieldsGrid}>
                  {yields.map((y, i) => (
                    <div key={i} style={styles.yieldCard}>
                      <span style={styles.yieldProtocol}>{y.name}</span>
                      <span style={styles.yieldApy}>
                        {y.apy != null ? `${Number(y.apy).toFixed(2)}% APY` : 'N/A'}
                      </span>
                      {y.asset && <span style={styles.yieldAsset}>{y.asset}</span>}
                    </div>
                  ))}
                </div>
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
                <span style={styles.modalLabel}>匹配工作流</span>
                <span style={styles.modalValueSlug}>
                  {matchingWorkflow
                    ? '⏳ 匹配中...'
                    : matchedSlug
                    ? <span style={styles.modalMatchRow}>
                        <span style={styles.modalSlugCode}>{matchedWorkflowName || matchedSlug}</span>
                        <span style={styles.modalSlugCode}>{matchedSlug}</span>
                      </span>
                    : <span style={styles.modalHint}>未匹配到精确工作流，将由 AI 自动选择</span>}
                </span>
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
    background: '#08090a',
    color: '#d0d6e0',
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },

  // ── Header ──
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '14px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: '#0f1011',
    flexWrap: 'wrap',
    gap: '8px',
  },
  logo: { display: 'flex', alignItems: 'center', gap: '10px' },
  logoIcon: { fontSize: '24px' },
  title: { fontSize: '18px', fontWeight: 600, color: '#00ff4f', margin: 0, letterSpacing: '-0.36px' },
  badge: {
    background: 'rgba(255,255,255,0.05)',
    padding: '4px 12px',
    borderRadius: '9999px',
    fontSize: '12px',
    color: '#8a8f98',
    whiteSpace: 'nowrap',
    border: '1px solid rgba(255,255,255,0.08)',
  },

  // ── Tab bar ──
  tabBar: {
    display: 'flex',
    gap: '6px',
    padding: '10px 24px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    background: '#08090a',
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

  // ── Chat header row (clear button) ──
  chatHeaderRow: {
    display: 'flex',
    justifyContent: 'flex-end',
    marginBottom: '10px',
  },
  clearChatBtn: {
    background: 'transparent',
    color: '#62666d',
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '4px 12px',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s',
  },

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
    padding: '14px 18px',
    borderRadius: '10px',
    marginBottom: '12px',
    maxWidth: '90%',
    fontSize: '14px',
    lineHeight: 1.6,
  },
  userMsg: { background: 'rgba(0,255,79,0.08)', alignSelf: 'flex-end', marginLeft: 'auto', border: '1px solid rgba(0,255,79,0.12)' },
  botMsg: { background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' },
  msgText: { margin: '6px 0 0 0', lineHeight: 1.6, wordBreak: 'break-word', color: '#d0d6e0' },
  wfId: {
    display: 'inline-block',
    marginTop: '8px',
    background: 'rgba(255,255,255,0.04)',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#00ff4f',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    border: '1px solid rgba(0,255,79,0.15)',
  },

  // ── Execution card ──
  execCard: {
    marginTop: '10px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '8px',
    padding: '12px 14px',
    boxShadow: '0 1px 2px rgba(0,0,0,0.2)',
  },
  execRow: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginBottom: '6px',
    flexWrap: 'wrap',
  },
  execLabel: {
    color: '#8a8f98',
    fontSize: '11px',
    fontWeight: 600,
    minWidth: '60px',
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  execId: {
    background: 'rgba(255,255,255,0.04)',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#7170ff',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    wordBreak: 'break-all',
    flex: 1,
    border: '1px solid rgba(113,112,255,0.2)',
  },
  execOutput: {
    background: 'rgba(255,255,255,0.03)',
    padding: '8px 10px',
    borderRadius: '4px',
    fontSize: '12px',
    color: '#8a8f98',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    wordBreak: 'break-all',
    whiteSpace: 'pre-wrap',
    maxHeight: '200px',
    overflowY: 'auto',
    flex: 1,
    display: 'block',
    border: '1px solid rgba(255,255,255,0.05)',
  },

  // ── Input ──
  inputArea: {
    display: 'flex',
    gap: '8px',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.05)',
    borderRadius: '10px',
    border: '1px solid rgba(255,255,255,0.1)',
    boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
  },
  input: {
    flex: 1,
    background: 'transparent',
    border: 'none',
    color: '#f7f8f8',
    fontSize: '15px',
    outline: 'none',
    minWidth: 0,
  },
  sendBtn: {
    background: '#00ff4f',
    color: '#08090a',
    border: 'none',
    padding: '10px 22px',
    borderRadius: '8px',
    fontWeight: 600,
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.2px',
  },

  // ── Workflows tab ──
  wfHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  wfTitle: { fontSize: '20px', color: '#f7f8f8', margin: 0, fontWeight: 600, letterSpacing: '-0.4px' },
  refreshBtn: {
    background: 'rgba(255,255,255,0.04)',
    color: '#8a8f98',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '8px 16px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  wfError: {
    background: 'rgba(239,68,68,0.1)',
    color: '#ef4444',
    padding: '10px 14px',
    borderRadius: '8px',
    fontSize: '13px',
    marginBottom: '16px',
    border: '1px solid rgba(239,68,68,0.2)',
  },

  // ── Workflow cards ──
  wfCard: {
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    marginBottom: '10px',
    overflow: 'hidden',
    boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
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
    background: 'rgba(15,16,17,0.97)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '28px',
    maxWidth: '480px',
    width: '100%',
    boxShadow: '0 0 0 1px rgba(0,0,0,0.3), 0 8px 32px rgba(0,0,0,0.5)',
  },
  modalHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '20px',
    paddingBottom: '14px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
  },
  modalIcon: { fontSize: '24px' },
  modalTitle: {
    color: '#f7f8f8',
    fontSize: '18px',
    fontWeight: 600,
    margin: 0,
    letterSpacing: '-0.36px',
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
    color: '#8a8f98',
    fontSize: '11px',
    fontWeight: 600,
    textTransform: 'uppercase',
    letterSpacing: '0.8px',
  },
  modalValue: {
    color: '#d0d6e0',
    fontSize: '14px',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    lineHeight: 1.5,
  },
  modalHint: {
    color: '#62666d',
    fontSize: '13px',
  },
  modalActions: {
    display: 'flex',
    gap: '10px',
    justifyContent: 'flex-end',
    paddingTop: '18px',
    borderTop: '1px solid rgba(255,255,255,0.06)',
  },
  modalCancelBtn: {
    background: 'rgba(255,255,255,0.04)',
    color: '#8a8f98',
    border: '1px solid rgba(255,255,255,0.06)',
    padding: '10px 22px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
  },
  modalConfirmBtn: {
    background: '#00ff4f',
    color: '#08090a',
    border: 'none',
    padding: '10px 26px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    letterSpacing: '-0.2px',
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

  // ── Strategies selector ──
  strategiesRow: {
    display: 'flex',
    gap: '8px',
    overflowX: 'auto',
    padding: '0 0 10px 0',
    scrollbarWidth: 'none',
    flexWrap: 'nowrap',
  },
  strategyPill: {
    flexShrink: 0,
    background: 'rgba(0, 255, 79, 0.06)',
    border: '1px solid rgba(0, 255, 79, 0.15)',
    color: '#00ff4f',
    padding: '7px 14px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
    whiteSpace: 'nowrap',
  },

  // ── Yields section ──
  yieldsSection: {
    marginTop: '24px',
    padding: '16px 18px',
    background: 'rgba(255,255,255,0.02)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
  },
  yieldsTitle: {
    color: '#f7f8f8',
    fontSize: '16px',
    fontWeight: 600,
    margin: '0 0 14px 0',
    letterSpacing: '-0.3px',
  },
  yieldsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
    gap: '10px',
  },
  yieldCard: {
    background: 'rgba(0, 255, 79, 0.04)',
    border: '1px solid rgba(0, 255, 79, 0.1)',
    borderRadius: '8px',
    padding: '12px 14px',
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  yieldProtocol: {
    color: '#d0d6e0',
    fontSize: '14px',
    fontWeight: 600,
  },
  yieldApy: {
    color: '#00ff4f',
    fontSize: '18px',
    fontWeight: 700,
    letterSpacing: '-0.3px',
  },
  yieldAsset: {
    color: '#8a8f98',
    fontSize: '12px',
    fontWeight: 500,
  },

  // ── Modal workflow slug ──
  modalValueSlug: {
    color: '#d0d6e0',
    fontSize: '14px',
    fontWeight: 500,
    background: 'rgba(255,255,255,0.03)',
    padding: '10px 14px',
    borderRadius: '8px',
    border: '1px solid rgba(255,255,255,0.06)',
    lineHeight: 1.5,
  },
  modalSlugCode: {
    background: 'rgba(0, 255, 79, 0.08)',
    color: '#00ff4f',
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '13px',
    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
    border: '1px solid rgba(0, 255, 79, 0.2)',
  },
  // ── Skeleton loading ──
  skeletonGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
  },
  skeletonCard: {
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '10px',
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    animation: 'pulse-skeleton 1.8s ease-in-out infinite',
  },
  skeletonLine: {
    height: '14px',
    borderRadius: '6px',
    background: 'rgba(255,255,255,0.06)',
  },
  modalMatchRow: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
    alignItems: 'center',
  },
};
