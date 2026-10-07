import assert from 'node:assert/strict';
import test from 'node:test';
import { createAuthStorage, REMEMBER_DEVICE_KEY } from '../src/lib/authStorage.ts';
const store = () => {
  const values = new Map<string, string>();
  return {getItem:(key:string)=>values.get(key)??null,setItem:(key:string,value:string)=>{values.set(key,value);},removeItem:(key:string)=>{values.delete(key);}};
};
test('opening another tab cannot clear the original tab session', () => {
  const device=store(), a=store(), b=store();
  const first=createAuthStorage(()=>device,()=>a), second=createAuthStorage(()=>device,()=>b);
  first.setItem('auth', 'fixture-session');
  assert.equal(second.getItem('auth'),null);
  assert.equal(first.getItem('auth'),'fixture-session');
  assert.equal(device.getItem('auth'),null);
});
test('ordinary sessions survive same-tab reload but not a fresh tab', () => {
  const device=store(), tab=store();
  createAuthStorage(()=>device,()=>tab).setItem('auth','fixture-session');
  assert.equal(createAuthStorage(()=>device,()=>tab).getItem('auth'),'fixture-session');
  assert.equal(createAuthStorage(()=>device,()=>store()).getItem('auth'),null);
});
test('device persistence requires explicit remember-device consent', () => {
  const device=store(), tab=store();
  device.setItem(REMEMBER_DEVICE_KEY,'1');
  const storage=createAuthStorage(()=>device,()=>tab);
  storage.setItem('auth','fixture-session');
  assert.equal(device.getItem('auth'),'fixture-session');
  assert.equal(tab.getItem('auth'),null);
  assert.equal(createAuthStorage(()=>device,()=>store()).getItem('auth'),'fixture-session');
});
test('revoked consent does not restore a device credential', () => {
  const device=store(),tab=store();
  device.setItem('auth','old-fixture-session');
  const storage=createAuthStorage(()=>device,()=>tab);
  assert.equal(storage.getItem('auth'),null);
  assert.equal(device.getItem('auth'),null);
  storage.setItem('auth','new-fixture-session');
  assert.equal(tab.getItem('auth'),'new-fixture-session');
  assert.equal(device.getItem('auth'),null);
});
test('explicit removal clears both persistence locations', () => {
  const device=store(),tab=store();
  device.setItem(REMEMBER_DEVICE_KEY,'1');
  const storage=createAuthStorage(()=>device,()=>tab);
  storage.setItem('auth','fixture-session');tab.setItem('auth','older-fixture-session');
  storage.removeItem('auth');
  assert.equal(device.getItem('auth'),null);assert.equal(tab.getItem('auth'),null);
});
test('blocked storage falls back to memory without device persistence', () => {
  const blocked=()=>{throw new Error('Storage blocked');};
  const storage=createAuthStorage(blocked,blocked);
  storage.setItem('auth','fixture-session');assert.equal(storage.getItem('auth'),'fixture-session');
  storage.removeItem('auth');assert.equal(storage.getItem('auth'),null);
});
