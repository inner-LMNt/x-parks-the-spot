import { handlers } from './handlers'

export const setUpMocks = async () => {
    if (typeof window !== 'undefined') {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { setupWorker } = require("msw/browser");
        const worker = setupWorker(...handlers)
        await worker.start();
    }
}