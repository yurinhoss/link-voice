export function normalizeVolume(value) {
  const n=Number(value);
  return Number.isFinite(n)?Math.min(100,Math.max(0,Math.round(n))):100;
}
export function participantVolume(preferences,userId) {
  return Object.hasOwn(preferences,userId)?normalizeVolume(preferences[userId]):100;
}
export function readVolumes(storage,key) {
  try {const value=JSON.parse(storage.getItem(key)||'{}');if(!value||typeof value!=='object'||Array.isArray(value))return {};return Object.fromEntries(Object.entries(value).map(([id,n])=>[id,normalizeVolume(n)]));}catch{return {};}
}
export function applyVolume(element,percent) {
  if(element)element.volume=normalizeVolume(percent)/100;
}
