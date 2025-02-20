import { Injectable, Logger } from '@nestjs/common';
import { TimeMeasure } from '../common/decorators';
import { UserEntity } from '../user/entity/user.entity';

import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import CryptoJS from 'crypto-js';
import { OrderSide } from '../common/enums';
import { AppConfig, BingXConfig } from '../common/interface';
import { CoinSymbol } from '../common/types';

interface PlaceOrder {
  user: UserEntity;
  symbol: CoinSymbol;
  price: number;
  margin: number;
  side: OrderSide;
  leverage?: number;
}

@Injectable()
export class TradingService {
  private readonly logger = new Logger(TradingService.name);
  constructor(private readonly configService: ConfigService<AppConfig>) {}

  @TimeMeasure()
  async placeTestOrder({
    user,
    symbol,
    price,
    margin,
    side,
    leverage,
  }: PlaceOrder) {
    if (!user.userConfig.apiKey || !user.userConfig.secretKey) {
      this.logger.verbose('Skip placeTestOrder since api keys are invalid!');
      return;
    }
    const coin = this.getBingxSymbol(symbol);

    await this.apiPlaceTestOrder(
      user.userConfig.apiKey,
      user.userConfig.secretKey,
      coin,
      price,
      margin,
      side,
      leverage,
    );
  }

  private getBingxSymbol(symbol: CoinSymbol) {
    return `${symbol.replace('USDT', '')}-USDT`;
  }

  private getParameters(API, timestamp, urlEncode?: boolean) {
    let parameters = '';
    for (const key in API.payload) {
      if (urlEncode) {
        parameters += key + '=' + encodeURIComponent(API.payload[key]) + '&';
      } else {
        parameters += key + '=' + API.payload[key] + '&';
      }
    }
    if (parameters) {
      parameters = parameters.substring(0, parameters.length - 1);
      parameters = parameters + '&timestamp=' + timestamp;
    } else {
      parameters = 'timestamp=' + timestamp;
    }
    return parameters;
  }

  private async apiPlaceTestOrder(
    apiKey: string,
    secretKey: string,
    coin: string,
    price: number,
    margin: number,
    side: OrderSide,
    leverage = 1,
  ) {
    const totalMargin = margin * leverage;
    const qty = totalMargin / price;
    const stopLossPrice = price - (margin * 0.1) / qty;
    const takeProfitPrice = price + (margin * 0.2) / qty;
    const API = {
      uri: '/openApi/swap/v2/trade/order',
      method: 'POST',
      payload: {
        symbol: coin,
        side: 'BUY',
        positionSide: `${side.toUpperCase()}`,
        type: 'MARKET',
        quantity: qty,
        takeProfit: `{"type": "TAKE_PROFIT_MARKET", "stopPrice": ${takeProfitPrice},"workingType":"MARK_PRICE"}`,
        stopLoss: `{"type": "STOP_MARKET", "stopPrice": ${stopLossPrice},"workingType":"MARK_PRICE"}`,
      },
      protocol: 'https',
    };

    const protocol = API.protocol;
    const path = API.uri;
    const method = API.method;
    const timestamp = new Date().getTime();
    const sign = CryptoJS.enc.Hex.stringify(
      CryptoJS.HmacSHA256(this.getParameters(API, timestamp), secretKey),
    );
    const url =
      protocol +
      '://' +
      this.configService.get<BingXConfig>('bingx')?.testHost +
      path +
      '?' +
      this.getParameters(API, timestamp, true) +
      '&signature=' +
      sign;
    const config = {
      method: method,
      url: url,
      headers: {
        'X-BX-APIKEY': apiKey,
      },
      transformResponse: (resp) => {
        this.logger.verbose('Placed order successfully', resp);
        return resp;
      },
    };
    try {
      return await axios(config);
    } catch (e) {
      this.logger.error(`Failed to place order. Error ${e}`);
    }
  }
}
