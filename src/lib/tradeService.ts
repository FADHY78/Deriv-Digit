import { derivSocket } from './derivSocket';
import type { ContractProposalRequest, ContractProposal, ActivePosition } from '../types/deriv';

export class TradeService {
  /**
   * Requests a live contract proposal quote from Deriv.
   */
  public async getProposal(req: ContractProposalRequest, currency: string = 'USD'): Promise<ContractProposal> {
    const payload: Record<string, any> = {
      proposal: 1,
      amount: req.stake,
      basis: 'stake',
      contract_type: req.contractType,
      currency: currency,
      duration: req.duration,
      duration_unit: 't', // ticks
      symbol: req.symbol,
    };

    if (req.barrier !== undefined) {
      payload.barrier = String(req.barrier);
    }

    const res = await derivSocket.sendRequest(payload);
    if (res.error) {
      throw new Error(res.error.message || 'Failed to fetch proposal quote');
    }

    const prop = res.proposal;
    return {
      id: prop.id,
      askPrice: prop.ask_price,
      payout: prop.payout,
      spot: prop.spot,
      barrier: String(prop.barrier ?? req.barrier ?? ''),
    };
  }

  /**
   * Executes contract purchase given a valid proposal ID.
   * Enforces max-stake guardrail client-side before sending buy request.
   */
  public async buyContract(
    proposalId: string,
    price: number,
    maxStakeGuardrail: number,
    allowOverride: boolean = false
  ): Promise<{ contractId: number; buyPrice: number; balanceAfter: number }> {
    if (price > maxStakeGuardrail && !allowOverride) {
      throw new Error(
        `Stake $${price.toFixed(2)} exceeds configured guardrail limit of $${maxStakeGuardrail.toFixed(2)}. Enable override in settings or reduce stake.`
      );
    }

    const res = await derivSocket.sendRequest({
      buy: proposalId,
      price: price,
    });

    if (res.error) {
      throw new Error(res.error.message || 'Buy contract execution failed');
    }

    const buyInfo = res.buy;
    return {
      contractId: buyInfo.contract_id,
      buyPrice: buyInfo.buy_price,
      balanceAfter: buyInfo.balance_after,
    };
  }

  /**
   * Subscribes to updates for an open contract.
   */
  public async subscribeOpenContract(
    contractId: number,
    onUpdate: (data: any) => void
  ): Promise<{ subscriptionId: string }> {
    const res = await derivSocket.sendRequest({
      proposal_open_contract: 1,
      contract_id: contractId,
      subscribe: 1,
    });

    if (res.error) {
      throw new Error(res.error.message || 'Failed to subscribe to open contract updates');
    }

    return {
      subscriptionId: res.subscription.id,
    };
  }
}

export const tradeService = new TradeService();
