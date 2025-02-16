export enum MarketTrend {
  Bullish = 'bullish',
  Bearish = 'bearish',
  Sideway = 'sideway',
}

export enum Command {
  Start = 'start',
  Status = 'status',
  Config = 'config',
}
export enum CallbackCommand {
  SetSymbols = 'set_symbols',
  SetIntervals = 'set_intervals',
  SwitchNotification = 'switch_notification',
  ResetConfig = 'reset_config',
}

export enum SignalLogTriggerSource {
  ScheduleJob = 'schedule_job',
  AppStart = 'app_start',
}
