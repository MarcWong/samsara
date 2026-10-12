import { writable } from 'svelte/store';
import { format } from './game/functions/util.js';
import './game/events.js';
import { tr } from './i18n.js';

// Replaces the old app's two popup types (achievement.js's $$event('achievement', ...)
// and the various $$event('message', [...]) calls from property.js) with one
// toast list. Message templates are the old src/i18n/en-us.js F_* keys, now
// kept (with their Chinese counterparts) in i18n.js as `msg.<key>`.

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
    const template = tr(`msg.${key}`);
    if (template === `msg.${key}`) return key;
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
        notify('achievement', tr('msg.achievement', { name: achievement.name }));
    });
}

export { notifications, notify, dismiss, wireNotifications };
