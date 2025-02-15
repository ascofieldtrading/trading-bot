export enum MarketTrend {
  Bullish = 'bullish',
  Bearish = 'bearish',
  Sideway = 'sideway',
}

export enum Command {
  Start = 'start',
  Stop = 'stop',
  Status = 'status',
  UpdateSymbols = 'update_symbols',
  UpdateIntervals = 'update_intervals',
  ResetConfig = 'reset_config',
}

export enum SignalLogType {
  UpdateRealtime = 'realtime_update',
  UpdateLastSideway = 'schedule_update',
}
