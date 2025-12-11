import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
  "I'm overwhelmed by this sprint deadline",
  "How do I handle difficult code reviews?",
  "Tips for managing on-call stress",
  "I'm frustrated with technical debt",
  "How to deal with production incidents?",
  "Struggling with work-life balance in tech",
  "Team conflict - how do I navigate it?",
  "I'm burnt out from long hours",
  "How to handle imposter syndrome?",
  "Dealing with scope creep and pressure"
];

export default function ChatPanel(){
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const endRef = useRef();
  const textareaRef = useRef();
  const messagesContainerRef = useRef();

  useEffect(()=> { 
    // Only auto-scroll if user is already at bottom
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const isAtBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 50;
      if (isAtBottom) {
        endRef.current?.scrollIntoView({behavior:'smooth'}); 
      }
    }
  }, [messages]);

  const handleKeyDown = (e) => {
    // Submit on Enter (but not Shift+Enter for new line)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    // Auto-resize textarea
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  };

  const selectQuickPrompt = (prompt) => {
    setText(prompt);
    setShowSuggestions(false);
    // Focus back on textarea
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  };

  async function send(){
    if(!text.trim() || isLoading) return;
    const msg = text;
    setText('');
    setShowSuggestions(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
    
    // Add user message and placeholder bot message
    setMessages(m => [...m, { from: 'user', text: msg }, { from: 'bot', text: '...' }]);
    setIsLoading(true);
    
    try{
      // Request Groq response
      const res = await fetch('http://localhost:4000/chat', {
        method: 'POST', 
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ message: msg })
      });
      
      if (!res.ok) throw new Error('Chat request failed');

      const data = await res.json();
      
      // ✅ Extract the plain text response from Groq
      const reply = data.reply || data.message || 'No response received';
      console.log('✅ Chat response:', reply);
      
      // Update last bot message with actual reply
      setMessages(m => {
        const copy = [...m];
        copy[copy.length - 1].text = reply;
        copy[copy.length - 1].isMarkdown = true; // ✅ Flag for markdown rendering
        return copy;
      });
    }catch(e){
      console.error('Chat error:', e);
      setMessages(m => {
        const copy = [...m];
        copy[copy.length - 1].text = 'Sorry, I could not reach the chat service.';
        return copy;
      });
    }
    
    setIsLoading(false);
  }

  // ✅ ENHANCED: Custom markdown components for rich text support
  const markdownComponents = {
    // ✅ Style bullet lists - Enhanced
    ul: ({children}) => (
      <ul style={{
        margin: '10px 0',
        paddingLeft: '20px',
        color: '#2C3E50',
        listStyleType: 'disc'
      }}>
        {children}
      </ul>
    ),
    // ✅ Style list items - Enhanced
    li: ({children}) => (
      <li style={{
        margin: '6px 0',
        lineHeight: '1.6',
        color: '#2C3E50',
        fontSize: '13px'
      }}>
        {children}
      </li>
    ),
    // ✅ Style ordered lists - Enhanced
    ol: ({children}) => (
      <ol style={{
        margin: '10px 0',
        paddingLeft: '20px',
        color: '#2C3E50',
        listStyleType: 'decimal'
      }}>
        {children}
      </ol>
    ),
    // ✅ ENHANCED: Tables with better styling
    table: ({children}) => (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        margin: '12px 0',
        fontSize: '12px',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '2px solid rgba(111, 168, 241, 0.3)',
        boxShadow: '0 2px 8px rgba(111, 168, 241, 0.1)'
      }}>
        {children}
      </table>
    ),
    // ✅ ENHANCED: Table header with gradient
    thead: ({children}) => (
      <thead style={{
        background: 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',
        color: '#fff'
      }}>
        {children}
      </thead>
    ),
    // ✅ Table header cells
    th: ({children}) => (
      <th style={{
        padding: '10px 12px',
        textAlign: 'left',
        fontWeight: '700',
        borderRight: '1px solid rgba(255,255,255,0.2)',
        color: '#fff',
        fontSize: '12px'
      }}>
        {children}
      </th>
    ),
    // ✅ Table body
    tbody: ({children}) => (
      <tbody>
        {children}
      </tbody>
    ),
    // ✅ ENHANCED: Table rows with alternating background
    tr: ({children, index}) => (
      <tr style={{
        background: index % 2 === 0 ? 'rgba(111, 168, 241, 0.05)' : '#fff',
        borderBottom: '1px solid rgba(111, 168, 241, 0.2)',
        transition: 'background-color 0.2s ease'
      }}>
        {children}
      </tr>
    ),
    // ✅ Table cells
    td: ({children}) => (
      <td style={{
        padding: '10px 12px',
        borderRight: '1px solid rgba(111, 168, 241, 0.1)',
        color: '#2C3E50',
        lineHeight: '1.5',
        fontSize: '12px'
      }}>
        {children}
      </td>
    ),
    // ✅ ENHANCED: Code blocks with better styling
    code: ({inline, children}) => (
      inline ? (
        <code style={{
          background: 'rgba(111, 168, 241, 0.15)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          color: '#0F4761',
          fontSize: '12px',
          border: '1px solid rgba(111, 168, 241, 0.2)'
        }}>
          {children}
        </code>
      ) : (
        <code style={{
          display: 'block',
          background: '#f5f7fa',
          padding: '10px',
          borderRadius: '6px',
          overflow: 'auto',
          fontFamily: 'monospace',
          fontSize: '12px',
          color: '#2C3E50',
          margin: '8px 0',
          border: '1px solid rgba(111, 168, 241, 0.2)',
          lineHeight: '1.5'
        }}>
          {children}
        </code>
      )
    ),
    // ✅ ENHANCED: Blockquotes
    blockquote: ({children}) => (
      <blockquote style={{
        borderLeft: '4px solid #6FA8F1',
        paddingLeft: '12px',
        marginLeft: 0,
        marginRight: 0,
        marginTop: '8px',
        marginBottom: '8px',
        color: '#666',
        fontStyle: 'italic',
        background: 'linear-gradient(90deg, rgba(111, 168, 241, 0.08) 0%, rgba(111, 168, 241, 0.02) 100%)',
        padding: '10px 12px',
        borderRadius: '4px',
        borderRight: '1px solid rgba(111, 168, 241, 0.1)'
      }}>
        {children}
      </blockquote>
    ),
    // ✅ ENHANCED: Headings
    h1: ({children}) => (
      <h1 style={{
        margin: '14px 0 8px 0',
        fontSize: '16px',
        fontWeight: '700',
        color: '#0F4761',
        borderBottom: '2px solid rgba(111, 168, 241, 0.2)',
        paddingBottom: '6px'
      }}>
        {children}
      </h1>
    ),
    h2: ({children}) => (
      <h2 style={{
        margin: '12px 0 6px 0',
        fontSize: '14px',
        fontWeight: '700',
        color: '#0F4761',
        borderBottom: '1px solid rgba(111, 168, 241, 0.15)',
        paddingBottom: '4px'
      }}>
        {children}
      </h2>
    ),
    h3: ({children}) => (
      <h3 style={{
        margin: '10px 0 4px 0',
        fontSize: '13px',
        fontWeight: '700',
        color: '#0F4761'
      }}>
        {children}
      </h3>
    ),
    // ✅ ENHANCED: Bold text styling
    strong: ({children}) => (
      <strong style={{
        fontWeight: '700',
        color: '#0F4761',
        backgroundColor: 'rgba(111, 168, 241, 0.08)',
        padding: '1px 4px',
        borderRadius: '3px'
      }}>
        {children}
      </strong>
    ),
    // ✅ ENHANCED: Emphasis styling
    em: ({children}) => (
      <em style={{
        fontStyle: 'italic',
        color: '#555',
        borderLeft: '3px solid #4FD1C5',
        paddingLeft: '6px',
        marginLeft: '-6px'
      }}>
        {children}
      </em>
    ),
    // ✅ ENHANCED: Paragraphs
    p: ({children}) => (
      <p style={{
        margin: '8px 0',
        lineHeight: '1.6',
        color: '#2C3E50',
        fontSize: '13px'
      }}>
        {children}
      </p>
    ),
    // ✅ Links
    a: ({href, children}) => (
      <a href={href} style={{
        color: '#6FA8F1',
        textDecoration: 'underline',
        cursor: 'pointer',
        fontWeight: '500',
        transition: 'all 0.2s ease'
      }} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    // ✅ Horizontal rule
    hr: () => (
      <hr style={{
        border: 'none',
        borderTop: '2px solid rgba(111, 168, 241, 0.2)',
        margin: '12px 0',
        borderRadius: '1px'
      }} />
    ),
    // ✅ Images
    img: ({src, alt}) => (
      <img src={src} alt={alt} style={{
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '6px',
        margin: '8px 0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
      }} />
    ),
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',minHeight:0,flex:1}}>
      <div ref={messagesContainerRef} style={{flex:1, overflowY:'auto', padding:'12px', background:'linear-gradient(180deg, rgba(111, 168, 241, 0.02) 0%, rgba(79, 209, 197, 0.02) 100%)'}}>
        {messages.length === 0 ? (
          // ✅ Empty state for chat
          <div className="empty-state" style={{height:'100%',justifyContent:'center'}}>
            <div className="empty-state-icon">💬</div>
            <div className="empty-state-title">Start a conversation</div>
            <div className="empty-state-text">Share what's on your mind or ask for support. I'm here to listen.</div>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              style={{
                marginBottom: '12px',
                display: 'flex',
                justifyContent: msg.from === 'user' ? 'flex-end' : 'flex-start',
                animation: 'fadeIn 0.3s ease'
              }}
            >
              <div
                style={{
                  maxWidth: '75%',
                  padding: '12px 14px',
                  borderRadius: msg.from === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
                  background: msg.from === 'user' ? 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)' : 'linear-gradient(135deg, #f5f5f5 0%, #e9e9e9 100%)',
                  color: msg.from === 'user' ? '#fff' : '#333',
                  fontSize: '13px',
                  lineHeight: '1.5',
                  boxShadow: msg.from === 'user' ? '0 4px 12px rgba(111, 168, 241, 0.25)' : 'none',
                  border: msg.from === 'user' ? 'none' : '1px solid rgba(0,0,0,0.1)',
                  wordWrap: 'break-word',
                  overflowWrap: 'break-word'
                }}
              >
                {msg.from === 'bot' ? (
                  <ReactMarkdown components={markdownComponents}>
                    {msg.text}
                  </ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))
        )}
        {isLoading && (
          // ✅ Loading state in chat
          <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
            marginBottom: '12px',
            animation: 'fadeIn 0.3s ease'
          }}>
            <div style={{
              display: 'flex',
              gap: '4px',
              alignItems: 'center'
            }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: '#6FA8F1',
                    animation: `bounce 1.4s infinite`,
                    animationDelay: `${i * 0.2}s`
                  }}
                />
              ))}
            </div>
            <style>{`
              @keyframes bounce {
                0%, 80%, 100% { transform: translateY(0); opacity: 0.6; }
                40% { transform: translateY(-8px); opacity: 1; }
              }
            `}</style>
          </div>
        )}
        <div ref={endRef} style={{flexShrink:0}} />
      </div>

      <div style={{display:'flex',padding:12,borderTop:'1px solid rgba(0,0,0,0.1)',background:'#fff',gap:8,flexShrink:0,flexDirection:'column'}}>
        {/* Quick prompts dropdown */}
        <div style={{position:'relative'}}>
          <button 
            onClick={() => setShowSuggestions(!showSuggestions)}
            style={{
              width:'100%',
              padding:'10px 12px',
              borderRadius:8,
              border:'1px solid rgba(111, 168, 241, 0.2)',
              background:'linear-gradient(135deg, #f8fbff 0%, #f0f8ff 100%)',
              cursor:'pointer',
              fontSize:'12px',
              fontWeight: '600',
              color:'#6FA8F1',
              textAlign:'left',
              display:'flex',
              justifyContent:'space-between',
              alignItems:'center',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              // ✅ ENHANCED: Better styling
              letterSpacing: '0.5px',
              boxShadow: '0 2px 6px rgba(111, 168, 241, 0.1)',
              textTransform: 'none'
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f0f8ff 0%, #e8f4f8 100%)';
              e.currentTarget.style.borderColor = '#6FA8F1';
              e.currentTarget.style.boxShadow = '0 4px 12px rgba(111, 168, 241, 0.15)';
              e.currentTarget.style.transform = 'translateY(-1px)';
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = 'linear-gradient(135deg, #f8fbff 0%, #f0f8ff 100%)';
              e.currentTarget.style.borderColor = 'rgba(111, 168, 241, 0.2)';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(111, 168, 241, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <span style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
              <span style={{fontSize: '14px'}}>💬</span>
              Quick prompts
            </span>
            <span style={{fontSize:'11px', opacity: 0.7}}>{showSuggestions ? '▲' : '▼'}</span>
          </button>
          
          {showSuggestions && (
            <div style={{
              position:'absolute',
              top:'100%',
              left:0,
              right:0,
              background:'#fff',
              border:'1px solid #d0d0d0',
              borderTop:'none',
              borderRadius:'0 0 8px 8px',
              maxHeight:'200px',
              overflow:'auto',
              zIndex:10,
              boxShadow:'0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => selectQuickPrompt(prompt)}
                  style={{
                    width:'100%',
                    padding:'12px 14px',
                    border:'none',
                    background:'transparent',
                    textAlign:'left',
                    cursor:'pointer',
                    fontSize:'13px',
                    color:'#2C3E50',
                    borderBottom: i < QUICK_PROMPTS.length - 1 ? '1px solid rgba(111, 168, 241, 0.1)' : 'none',
                    transition:'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                    // ✅ ENHANCED: Better typography
                    fontWeight: '500',
                    lineHeight: '1.5',
                    letterSpacing: '0.3px',
                    // ✅ Hover state
                    position: 'relative',
                    overflow: 'hidden'
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(90deg, rgba(111, 168, 241, 0.08) 0%, rgba(79, 209, 197, 0.05) 100%)';
                    e.currentTarget.style.color = '#6FA8F1';
                    e.currentTarget.style.fontWeight = '600';
                    e.currentTarget.style.paddingLeft = '18px';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#2C3E50';
                    e.currentTarget.style.fontWeight = '500';
                    e.currentTarget.style.paddingLeft = '14px';
                  }}
                >
                  {/* ✅ Add visual indicator icon */}
                  <span style={{
                    display: 'inline-block',
                    marginRight: '8px',
                    fontSize: '13px',
                    opacity: 0.6
                  }}>
                    💭
                  </span>
                  {prompt}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ✅ ENHANCED: Text input and send button with icon */}
        <div style={{display:'flex',gap:8,alignItems:'flex-end'}}>
          <textarea 
            ref={textareaRef}
            value={text} 
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            disabled={isLoading}
            style={{
              flex:1,
              padding:10,
              borderRadius:10,
              border:'1px solid #D1E7F0',
              fontSize:'14px',
              fontFamily:'Inter, system-ui, sans-serif',
              resize:'none',
              minHeight:'40px',
              maxHeight:'120px',
              boxShadow:'0 2px 6px rgba(111,168,241,0.1)',
              opacity: isLoading ? 0.6 : 1,
              cursor: isLoading ? 'not-allowed' : 'text',
              overflow:'hidden',
              transition: 'all 0.2s ease'
            }} 
            placeholder="Say something... (Press Enter to send, Shift+Enter for new line)"
          />
          
          {/* ✅ ENHANCED: Send button with icon and theme colors */}
          <button 
            onClick={send}
            disabled={isLoading || !text.trim()}
            title="Send message"
            style={{
              padding:'10px 14px',
              borderRadius:8,
              background: (isLoading || !text.trim()) ? 'linear-gradient(135deg, #d0d0d0 0%, #c0c0c0 100%)' : 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',
              color:'#fff',
              border:'none',
              cursor: isLoading || !text.trim() ? 'not-allowed' : 'pointer',
              fontWeight:'600',
              fontSize:'14px',
              boxShadow: (isLoading || !text.trim()) ? 'none' : '0 4px 12px rgba(111,168,241,0.3)',
              transition:'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: isLoading || !text.trim() ? 0.6 : 1,
              flexShrink:0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              minWidth: '44px',
              height: '44px'
            }}
            onMouseOver={(e) => {
              if (!isLoading && text.trim()) {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(111,168,241,0.4)';
              }
            }}
            onMouseOut={(e) => {
              e.target.style.transform = 'translateY(0)';
              if (!isLoading && text.trim()) {
                e.target.style.boxShadow = '0 4px 12px rgba(111,168,241,0.3)';
              }
            }}
            onActive={(e) => {
              if (!isLoading && text.trim()) {
                e.target.style.transform = 'scale(0.95)';
              }
            }}
          >
            {/* ✅ Icon: Send/Paper Plane with filled style */}
            <span style={{fontSize:'16px'}}>✈️</span>
            {/* Optionally show text on larger screens */}
            <span style={{display:'none'}}>Send</span>
          </button>
        </div>
      </div>
    </div>
  )
}
