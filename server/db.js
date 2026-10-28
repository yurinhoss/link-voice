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
PRAGMA user_version=2;`);return db;}
