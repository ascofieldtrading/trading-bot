export enum MarketTrend {
  Bullish = 'bullish',
  Bearish = 'bearish',
  Sideway = 'sideway',
}

export enum Command {
  Start = 'start',
  Stop = 'stop',
  Status = 'status',
  SetSymbols = 'set_symbols',
  SetIntervals = 'set_intervals',
  ResetConfig = 'reset_config',
}

export enum SignalLogTriggerSource {
  ScheduleJob = 'schedule_job',
  AppStart = 'app_start',
}
