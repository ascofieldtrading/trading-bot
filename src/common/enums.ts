export enum MarketTrend {
  Bullish = 'bullish',
  Bearish = 'bearish',
  Sideway = 'sideway',
}

export enum Command {
  Start = 'start',
  Status = 'status',
}
export enum CallbackCommand {
  SetSymbols = 'set_symbols',
  SetIntervals = 'set_intervals',
  SwitchNotification = 'switch_notification',
  LookingForTrend = 'looking_for_trend',
}

export enum SignalLogTriggerSource {
  ScheduleJob = 'schedule_job',
  AppStart = 'app_start',
}

export enum ConfirmCommand {
  OK = 'OK',
}
