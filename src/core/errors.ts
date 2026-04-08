export class BuildError extends Error {
    constructor(message: string, readonly cause?: Error) {
        super(message);
        this.name = 'BuildError';
    }
}

export class ConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigError';
    }
}
