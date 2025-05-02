import { useNavigate } from 'react-router';

export default function NotFound() {
  const navigate = useNavigate();

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        textAlign: 'center',
        padding: '2rem',
      }}
    >
      <h1 style={{ fontSize: '8rem', marginBottom: '1rem', color: '#ccc' }}>404</h1>
      <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#333' }}>頁面不存在</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', color: '#666', maxWidth: '500px' }}>
        您請求的頁面可能已被移除或暫時不可用。
      </p>
      <a
        href="/dashboard"
        style={{
          padding: '0.75rem 1.5rem',
          backgroundColor: '#4a6cf7',
          color: 'white',
          textDecoration: 'none',
          borderRadius: '4px',
          fontWeight: 'bold',
        }}
      >
        返回首頁
      </a>
    </div>
  );
}
