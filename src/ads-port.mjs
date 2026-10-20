/** Future integration boundary. Permanently disabled in 0.6: no SDK, fetch, UI or reward. */
export class DisabledAdsPort {
  constructor(){this.enabled=false;Object.freeze(this);}
  isAvailable(){return false;}
  async request(){return Object.freeze({status:'disabled',rewarded:false});}
  dispose(){}
}
