import { CallbackCommand } from '../common/enums';

export const encodeCallbackCommandData = (
  callbackCommand: CallbackCommand,
  value: string,
) => {
  return `${callbackCommand}__${value}`;
};

export const decodeCallbackCommandData = (value: string) => {
  return value.split('__');
};
