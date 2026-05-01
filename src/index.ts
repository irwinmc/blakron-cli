#!/usr/bin/env node

import { Command } from 'commander';
import { buildCommand } from './commands/build.js';
import { createCommand } from './commands/create.js';
import { cleanCommand } from './commands/clean.js';
import { devCommand } from './commands/dev.js';

const program = new Command();

program.name('blakron').description('Blakron - Egret Next CLI').version('0.1.0');

program.addCommand(buildCommand);
program.addCommand(devCommand);
program.addCommand(createCommand);
program.addCommand(cleanCommand);

program.parse();
