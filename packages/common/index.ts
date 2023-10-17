/* eslint-disable @typescript-eslint/explicit-module-boundary-types */
/* eslint-disable @typescript-eslint/no-explicit-any */

export const envWithDefault = <T = any>(envName: string, defaultValue: any): T => {
  return process.env[envName] ?? defaultValue;
};

export const mustDefineEnv = <T = any>(envName: string): T => {
  if (!process.env[envName]) {
    throw new Error(`Environmental variable: ${envName} is undefined but required to set`);
  }
  return process.env[envName] as any as T;
};

export const booleanEnvWithDefault = (envName: string, defaultValue: boolean): boolean => {
  if (process.env[envName] === 'false' || process.env[envName] === '0' || process.env[envName] === '') {
    return false;
  } else if (process.env[envName] === undefined) {
    return defaultValue;
  } else {
    return true;
  }
};
