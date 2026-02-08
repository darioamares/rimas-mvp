import Link from 'next/link';

export default function HomePage() {
  return (
    <div style={{ backgroundColor: 'black', color: 'white', height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'sans-serif' }}>
      <h1 style={{ color: '#00FFFF' }}>⚡ RIMAS MVP</h1>
      <p>Selecciona una sala para batallar:</p>
      <div style={{ display: 'flex', gap: '20px', marginTop: '20px' }}>
        <Link href="/rooms/batalla-1" style={{ padding: '15px 30px', background: 'white', color: 'black', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
          SALA 1
        </Link>
        <Link href="/rooms/batalla-2" style={{ padding: '15px 30px', background: 'white', color: 'black', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none' }}>
          SALA 2
        </Link>
      </div>
    </div>
  );
}
