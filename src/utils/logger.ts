const reset = '\x1b[0m';
const green = '\x1b[32m';
const yellow = '\x1b[33m';
const red = '\x1b[31m';
const cyan = '\x1b[36m';

export const logger = {
    info: (msg: string): void => console.log(`${cyan}[blakron]${reset} ${msg}`),
    success: (msg: string): void => console.log(`${green}[blakron]${reset} ${msg}`),
    warn: (msg: string): void => console.warn(`${yellow}[blakron]${reset} ${msg}`),
    error: (msg: string): void => console.error(`${red}[blakron]${reset} ${msg}`),
};
