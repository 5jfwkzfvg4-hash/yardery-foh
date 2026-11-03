// Security rules checks (run with: npm test). Uses the Firebase emulator, never the real database.
import {readFileSync} from 'node:fs';
import {initializeTestEnvironment, assertFails, assertSucceeds} from '@firebase/rules-unit-testing';
import {doc, setDoc, deleteDoc, getDoc, getDocs, collection, updateDoc, serverTimestamp, Timestamp} from 'firebase/firestore';

const env = await initializeTestEnvironment({projectId: 'demo-yardery', firestore: {rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080}});
const A = env.authenticatedContext('uidA').firestore();
const B = env.authenticatedContext('uidB').firestore();
const M = env.authenticatedContext('uidM').firestore();
const anon = env.unauthenticatedContext().firestore();
await env.withSecurityRulesDisabled(c => setDoc(doc(c.firestore(), 'locations/sanford/managers/uidM'), {name: 'Clay'}));

const P = 'locations/sanford/days/2026-11-03/checks/';
const check = (uid, task, extra = {}) => ({task, name: 'Ana', uid, at: serverTimestamp(), tappedAt: Timestamp.now(), ...extra});
let n = 0, bad = 0;
async function t(name, p) { n++; try { await p; console.log('PASS', name); } catch (e) { bad++; console.log('FAIL', name, '-', e.message); } }

await t('signed-in phone can check a task', assertSucceeds(setDoc(doc(A, P + 'o-dust'), check('uidA', 'o-dust'))));
await t('weekly sheet works too', assertSucceeds(setDoc(doc(A, 'locations/sanford/weeks/2026-11-02/checks/w-mon-out'), check('uidA', 'w-mon-out'))));
await t('signed-in phone can read checks', assertSucceeds(getDocs(collection(A, P.slice(0, -1)))));
await t('outsider (not signed in) cannot read', assertFails(getDocs(collection(anon, P.slice(0, -1)))));
await t('outsider (not signed in) cannot write', assertFails(setDoc(doc(anon, P + 'o-taps'), check('x', 'o-taps'))));
await t('cannot check as someone else', assertFails(setDoc(doc(A, P + 'o-taps'), check('uidB', 'o-taps'))));
await t('cannot fake the time', assertFails(setDoc(doc(A, P + 'o-taps'), check('uidA', 'o-taps', {at: Timestamp.fromDate(new Date('2026-01-01'))}))));
await t('cannot add extra fields (no pay, SSN, etc.)', assertFails(setDoc(doc(A, P + 'o-taps'), check('uidA', 'o-taps', {ssn: '123'}))));
await t('task id must match the document', assertFails(setDoc(doc(A, P + 'o-taps'), check('uidA', 'o-ice'))));
await t('bad day key rejected', assertFails(setDoc(doc(A, 'locations/sanford/days/yesterday/checks/o-taps'), check('uidA', 'o-taps'))));
await t('only days/weeks sheets allowed', assertFails(setDoc(doc(A, 'locations/sanford/other/2026-11-03/checks/o-taps'), check('uidA', 'o-taps'))));
await t('someone else cannot overwrite a check', assertFails(setDoc(doc(B, P + 'o-dust'), check('uidB', 'o-dust'))));
await t('nobody can edit a check', assertFails(updateDoc(doc(A, P + 'o-dust'), {name: 'Bob'})));
await t('another employee cannot uncheck it', assertFails(deleteDoc(doc(B, P + 'o-dust'))));
await t('the person who checked it can uncheck it', assertSucceeds(deleteDoc(doc(A, P + 'o-dust'))));
await setDoc(doc(A, P + 'o-dust'), check('uidA', 'o-dust'));
await t('a manager can uncheck anyone', assertSucceeds(deleteDoc(doc(M, P + 'o-dust'))));
await t('nobody can make themselves a manager', assertFails(setDoc(doc(A, 'locations/sanford/managers/uidA'), {name: 'Ana'})));
await t('phone can see if it is a manager', assertSucceeds(getDoc(doc(A, 'locations/sanford/managers/uidA'))));
await t('phone cannot read the manager list', assertFails(getDocs(collection(A, 'locations/sanford/managers'))));
await t('phone saves its own first name', assertSucceeds(setDoc(doc(A, 'locations/sanford/devices/uidA'), {name: 'Ana', lastSeen: serverTimestamp()})));
await t('phone cannot change another phone', assertFails(setDoc(doc(A, 'locations/sanford/devices/uidB'), {name: 'Ana', lastSeen: serverTimestamp()})));
await t('phone cannot read other phones', assertFails(getDoc(doc(B, 'locations/sanford/devices/uidA'))));
await t('nothing else in the database is open', assertFails(setDoc(doc(A, 'anything/x'), {a: 1})));
await env.cleanup();
console.log(`\n${n - bad} of ${n} rules checks passed`);
process.exit(bad ? 1 : 0);
