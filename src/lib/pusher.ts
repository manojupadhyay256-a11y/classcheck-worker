import Pusher from 'pusher-js';

// Reconnection logic and default configuration
const PUSHER_KEY = import.meta.env.VITE_PUSHER_KEY || 'YOUR_PUSHER_KEY';
const PUSHER_CLUSTER = import.meta.env.VITE_PUSHER_CLUSTER || 'mt1';

export const pusher = new Pusher(PUSHER_KEY, {
    cluster: PUSHER_CLUSTER,
    forceTLS: true,
    enabledTransports: ['ws', 'wss'],
    // Private channel authentication endpoint
    // authEndpoint: '/api/pusher/auth', 
});

// Logs for debugging reconnection issues on slow networks
pusher.connection.bind('state_change', (states: { current: string, previous: string }) => {
    console.log(`[Pusher] State changed from ${states.previous} to ${states.current}`);
});

pusher.connection.bind('error', (err: any) => {
    console.error('[Pusher] Connection error:', err);
});
