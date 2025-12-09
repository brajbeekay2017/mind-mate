import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';

export default function ChatPanel(){
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
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

  async function send(){
    if(!text.trim() || isLoading) return;
    const msg = text;
    setText('');
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

  // ✅ NEW: Custom markdown components for better styling
  const markdownComponents = {
    // Style bullet lists
    ul: ({children}) => (
      <ul style={{
        margin: '8px 0',
        paddingLeft: '20px',
        color: '#2C3E50'
      }}>
        {children}
      </ul>
    ),
    li: ({children}) => (
      <li style={{
        margin: '4px 0',
        lineHeight: '1.6',
        color: '#2C3E50'
      }}>
        {children}
      </li>
    ),
    // Style ordered lists
    ol: ({children}) => (
      <ol style={{
        margin: '8px 0',
        paddingLeft: '20px',
        color: '#2C3E50'
      }}>
        {children}
      </ol>
    ),
    // Style tables
    table: ({children}) => (
      <table style={{
        width: '100%',
        borderCollapse: 'collapse',
        margin: '8px 0',
        fontSize: '12px',
        borderRadius: '6px',
        overflow: 'hidden',
        border: '1px solid rgba(111, 168, 241, 0.2)'
      }}>
        {children}
      </table>
    ),
    thead: ({children}) => (
      <thead style={{
        background: 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',
        color: '#fff'
      }}>
        {children}
      </thead>
    ),
    th: ({children}) => (
      <th style={{
        padding: '8px 10px',
        textAlign: 'left',
        fontWeight: '600',
        borderRight: '1px solid rgba(255,255,255,0.2)',
        color: '#fff'
      }}>
        {children}
      </th>
    ),
    tbody: ({children}) => (
      <tbody>
        {children}
      </tbody>
    ),
    tr: ({children, index}) => (
      <tr style={{
        background: index % 2 === 0 ? 'rgba(111, 168, 241, 0.05)' : '#fff',
        borderBottom: '1px solid rgba(111, 168, 241, 0.1)'
      }}>
        {children}
      </tr>
    ),
    td: ({children}) => (
      <td style={{
        padding: '8px 10px',
        borderRight: '1px solid rgba(111, 168, 241, 0.1)',
        color: '#2C3E50',
        lineHeight: '1.5'
      }}>
        {children}
      </td>
    ),
    // Style code blocks
    code: ({inline, children}) => (
      inline ? (
        <code style={{
          background: 'rgba(111, 168, 241, 0.1)',
          padding: '2px 6px',
          borderRadius: '4px',
          fontFamily: 'monospace',
          color: '#0F4761',
          fontSize: '12px'
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
          border: '1px solid rgba(111, 168, 241, 0.2)'
        }}>
          {children}
        </code>
      )
    ),
    // Style blockquotes
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
        background: 'rgba(111, 168, 241, 0.05)',
        padding: '10px 12px',
        borderRadius: '4px'
      }}>
        {children}
      </blockquote>
    ),
    // Style headings
    h1: ({children}) => (
      <h1 style={{
        margin: '12px 0 8px 0',
        fontSize: '16px',
        fontWeight: '600',
        color: '#0F4761'
      }}>
        {children}
      </h1>
    ),
    h2: ({children}) => (
      <h2 style={{
        margin: '10px 0 6px 0',
        fontSize: '14px',
        fontWeight: '600',
        color: '#0F4761'
      }}>
        {children}
      </h2>
    ),
    h3: ({children}) => (
      <h3 style={{
        margin: '8px 0 4px 0',
        fontSize: '13px',
        fontWeight: '600',
        color: '#0F4761'
      }}>
        {children}
      </h3>
    ),
    // Style paragraphs
    p: ({children}) => (
      <p style={{
        margin: '6px 0',
        lineHeight: '1.6',
        color: '#2C3E50'
      }}>
        {children}
      </p>
    ),
    // Style links
    a: ({href, children}) => (
      <a href={href} style={{
        color: '#6FA8F1',
        textDecoration: 'none',
        borderBottom: '1px solid #6FA8F1',
        cursor: 'pointer'
      }} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    ),
    // Style horizontal rule
    hr: () => (
      <hr style={{
        border: 'none',
        borderTop: '1px solid rgba(111, 168, 241, 0.2)',
        margin: '12px 0'
      }} />
    ),
    // Style images
    img: ({src, alt}) => (
      <img src={src} alt={alt} style={{
        maxWidth: '100%',
        height: 'auto',
        borderRadius: '6px',
        margin: '8px 0'
      }} />
    ),
  };

  return (
    <div style={{display:'flex',flexDirection:'column',height:'100%',background:'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',minHeight:0,flex:1}}>
      <div ref={messagesContainerRef} style={{flex:1,overflow:'auto',padding:12,display:'flex',flexDirection:'column',minHeight:0}}>
        {messages.length === 0 && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%',color:'#888',fontSize:'14px',textAlign:'center',fontStyle:'italic'}}>
            Start a conversation. I'm here to listen and support you.
          </div>
        )}
        {messages.map((m,i)=> (
          <div key={i} style={{margin:'8px 0',textAlign: m.from === 'user' ? 'right' : 'left',flexShrink:0}}>
            <div style={{
              display:'inline-block',
              background: m.from === 'user' ? '#6FA8F1' : '#E8F4F8',
              color: m.from === 'user' ? '#fff' : '#2C3E50',
              padding:'10px 14px',
              borderRadius:14,
              boxShadow:'0 2px 8px rgba(0,0,0,0.08)',
              maxWidth:'85%',
              wordWrap:'break-word',
              textAlign: 'left' // ✅ Reset text alignment for content
            }}>
              {/* ✅ NEW: Render markdown for bot messages */}
              {m.from === 'bot' && m.isMarkdown ? (
                <ReactMarkdown components={markdownComponents}>
                  {m.text}
                </ReactMarkdown>
              ) : (
                m.text
              )}
            </div>
          </div>
        ))}
        <div ref={endRef} style={{flexShrink:0}} />
      </div>

      <div style={{display:'flex',padding:12,borderTop:'1px solid rgba(0,0,0,0.1)',background:'#fff',gap:8,flexShrink:0}}>
        <textarea 
          ref={textareaRef}
          value={text} 
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          disabled={isLoading}
          style={{flex:1,padding:10,borderRadius:10,border:'1px solid #D1E7F0',fontSize:'14px',fontFamily:'Inter, system-ui, sans-serif',resize:'none',minHeight:'40px',maxHeight:'120px',boxShadow:'0 2px 6px rgba(111,168,241,0.1)',opacity: isLoading ? 0.6 : 1,cursor: isLoading ? 'not-allowed' : 'text',overflow:'hidden'}} 
          placeholder="Say something... (Press Enter to send, Shift+Enter for new line)"
        />
        <button 
          onClick={send}
          disabled={isLoading || !text.trim()}
          style={{padding:'10px 16px',borderRadius:10,background: isLoading || !text.trim() ? '#ccc' : 'linear-gradient(135deg, #6FA8F1 0%, #4FD1C5 100%)',color:'#fff',border:'none',cursor: isLoading || !text.trim() ? 'not-allowed' : 'pointer',fontWeight:'600',boxShadow: isLoading ? 'none' : '0 4px 12px rgba(111,168,241,0.3)',transition:'all 0.3s ease',opacity: isLoading || !text.trim() ? 0.6 : 1,flexShrink:0}}
          onMouseOver={(e) => !isLoading && text.trim() && (e.target.style.transform = 'translateY(-2px)')}
          onMouseOut={(e) => e.target.style.transform = 'translateY(0)'}
        >
          {isLoading ? 'Sending...' : 'Send'}
        </button>
      </div>
    </div>
  )
}
