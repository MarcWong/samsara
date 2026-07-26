import { writable } from 'svelte/store';
import { format } from './game/functions/util.js';
import './game/events.js';

// Replaces the old app's two popup types (achievement.js's $$event('achievement', ...)
// and the various $$event('message', [...]) calls from property.js) with one
// toast list. Message templates are copied from src/i18n/en-us.js's F_* keys —
// the old app's $lang indirection existed for zh-cn support, which this port
// isn't carrying forward (see events.json's en-us-only rewrite earlier this
// project), so the strings are inlined directly instead of re-adding an i18n layer.
const MESSAGE_TEMPLATES = {
    F_PropertyPointLeft: 'You have left {0} property point',
    F_TalentReplace: 'Talent replace [{source.name}] -> [{target.name}]',
};

const notifications = writable([]);
let nextId = 0;

function notify(kind, text) {
    const id = ++nextId;
    notifications.update(list => [...list, { id, kind, text }]);
    setTimeout(() => dismiss(id), 4000);
    return id;
}

function dismiss(id) {
    notifications.update(list => list.filter(n => n.id !== id));
}

function formatMessage(key, args) {
    const template = MESSAGE_TEMPLATES[key];
    if (!template) return key;
    return format(template, ...args);
}

let wired = false;
function wireNotifications() {
    if (wired) return;
    wired = true;

    globalThis.$$on('message', data => {
        const [message, ...args] = data;
        const text = Array.isArray(message)
            ? message.map(([m, ...a]) => formatMessage(m, a)).join('\n')
            : formatMessage(message, args);
        notify('message', text);
    });

    globalThis.$$on('achievement', achievement => {
        notify('achievement', `Achievement unlocked: ${achievement.name}`);
    });
}

export { notifications, notify, dismiss, wireNotifications };
