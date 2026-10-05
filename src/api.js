export async function api(path, data) {
  const response = await fetch('/api'+path, data === undefined ? {} : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Something went wrong. Please try again.');
  return result;
}
export async function upload(file) {
  if (!file) throw new Error('Choose a file first.');
  if (file.size>50*1024*1024) throw new Error('Choose a file up to 50 MB.');
  const ticket=await api('/upload-url',{type:file.type,size:file.size});
  const response = ticket.local
    ? await fetch('/api/upload',{method:'POST',headers:{'Content-Type':file.type},body:file})
    : await fetch(ticket.signedUrl,{method:'PUT',headers:{'Content-Type':file.type},body:file});
  if (!response.ok) throw new Error('Upload failed. Please try again.');
  return ticket.local ? (await response.json()).url : ticket.url;
}
export const uid=()=>crypto.randomUUID();
export function youtubeId(value) {
  try { const u=new URL(value); if(u.hostname==='youtu.be') return u.pathname.slice(1).split('/')[0]; if(['youtube.com','www.youtube.com','www.youtube-nocookie.com'].includes(u.hostname)) return u.searchParams.get('v') || u.pathname.split('/').filter(Boolean)[1]; } catch {}
  return null;
}
