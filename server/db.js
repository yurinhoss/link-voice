import {randomUUID} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';import {join} from 'node:path';
export function openDb(dir){mkdirSync(dir,{recursive:true});const db=new DatabaseSync(join(dir,'link.db'));db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,name TEXT NOT NULL,password TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,expires INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS tenants(id TEXT PRIMARY KEY,name TEXT NOT NULL,created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS members(tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,role TEXT NOT NULL CHECK(role IN ('owner','member')),PRIMARY KEY(tenant_id,user_id));
CREATE TABLE IF NOT EXISTS rooms(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,name TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS rooms_tenant ON rooms(tenant_id);
CREATE TABLE IF NOT EXISTS invites(token TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,expires INTEGER NOT NULL,uses INTEGER NOT NULL DEFAULT 0,max_uses INTEGER NOT NULL DEFAULT 20);
CREATE TABLE IF NOT EXISTS user_profiles(user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,avatar TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS text_channels(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,name TEXT NOT NULL COLLATE NOCASE,created INTEGER NOT NULL,UNIQUE(tenant_id,name));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY AUTOINCREMENT,channel_id TEXT NOT NULL REFERENCES text_channels(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,body TEXT NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS messages_channel ON messages(channel_id,id);
CREATE TABLE IF NOT EXISTS media_assets(id TEXT PRIMARY KEY,tenant_id TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,kind TEXT NOT NULL CHECK(kind IN ('sound','image')),name TEXT NOT NULL,mime TEXT NOT NULL,data BLOB NOT NULL,size INTEGER NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS media_assets_tenant ON media_assets(tenant_id);
CREATE TABLE IF NOT EXISTS chat_files(id TEXT PRIMARY KEY,channel_id TEXT NOT NULL REFERENCES text_channels(id) ON DELETE CASCADE,user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,message_id INTEGER REFERENCES messages(id) ON DELETE CASCADE,name TEXT NOT NULL,mime TEXT NOT NULL,size INTEGER NOT NULL,data BLOB NOT NULL,created INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS chat_files_channel ON chat_files(channel_id,user_id);
CREATE INDEX IF NOT EXISTS chat_files_message ON chat_files(message_id);
CREATE TABLE IF NOT EXISTS room_music(room_id TEXT PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,state TEXT NOT NULL);
`);
if(!db.prepare('PRAGMA table_info(rooms)').all().some(c=>c.name==='kind'))db.exec("ALTER TABLE rooms ADD COLUMN kind TEXT NOT NULL DEFAULT 'voice'");
if(db.prepare('PRAGMA user_version').get().user_version<5){for(const t of db.prepare('SELECT id FROM tenants').all())if(!db.prepare("SELECT id FROM rooms WHERE tenant_id=? AND kind='music'").get(t.id))db.prepare("INSERT INTO rooms(id,tenant_id,name,created,kind) VALUES(?,?,?,?,?)").run(randomUUID(),t.id,'Música',Date.now(),'music');db.exec('PRAGMA user_version=5');}
if(!db.prepare('PRAGMA table_info(text_channels)').all().some(c=>c.name==='kind'))db.exec("ALTER TABLE text_channels ADD COLUMN kind TEXT NOT NULL DEFAULT 'text'");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS frequent_channel_per_tenant ON text_channels(tenant_id) WHERE kind='frequent'");
for(const t of db.prepare('SELECT id FROM tenants').all())ensureFrequentChannel(db,t.id);
db.exec('PRAGMA user_version=7');return db;}
export function ensureFrequentChannel(db,tenantId){
 if(db.prepare("SELECT id FROM text_channels WHERE tenant_id=? AND kind='frequent'").get(tenantId))return;
 let name='Usados com frequência',suffix=1;
 while(db.prepare('SELECT id FROM text_channels WHERE tenant_id=? AND name=? COLLATE NOCASE').get(tenantId,name))name='Usados com frequência '+(++suffix);
 db.prepare('INSERT INTO text_channels(id,tenant_id,name,created,kind) VALUES(?,?,?,?,?)').run(randomUUID(),tenantId,name,Date.now(),'frequent');
}
