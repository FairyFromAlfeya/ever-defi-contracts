import {
  Address,
  Contract,
  WalletTypes,
  lockliftChai,
  zeroAddress,
} from 'locklift';
import { FactorySource } from '../build/factorySource';
import chai, { expect } from 'chai';
import { TvmCellWithSigner0, EmptyEthereumEventData } from './contants';

chai.use(lockliftChai);

describe('TokenOracle', () => {
  let address: Address;
  let oracleExample: Contract<FactorySource['TokenOracleExample']>;
  let callbacksExample: Contract<FactorySource['TokenOracleCallbacksExample']>;

  before('deploy contracts', async () => {
    const signer = await locklift.keystore.getSigner('0');

    const { account } = await locklift.factory.accounts.addNewAccount({
      value: locklift.utils.toNano(100),
      publicKey: signer.publicKey,
      type: WalletTypes.WalletV3,
    });

    address = account.address;

    const { contract: exampleOracle } = await locklift.factory.deployContract({
      contract: 'TokenOracleExample',
      publicKey: signer.publicKey,
      initParams: { _nonce: locklift.utils.getRandomNonce() },
      constructorParams: { _remainingGasTo: address },
      value: locklift.utils.toNano(10),
    });

    const { contract: exampleCallbacks } =
      await locklift.factory.deployContract({
        contract: 'TokenOracleCallbacksExample',
        publicKey: signer.publicKey,
        initParams: {
          _nonce: locklift.utils.getRandomNonce(),
          _oracle: exampleOracle.address,
        },
        constructorParams: { _remainingGasTo: address },
        value: locklift.utils.toNano(10),
      });

    oracleExample = exampleOracle;
    callbacksExample = exampleCallbacks;
  });

  describe('set prices', () => {
    it('set price 123 and scale 3', async () => {
      const { traceTree } = await locklift.tracing.trace(
        oracleExample.methods
          .setPriceAndScale({
            _tokenA: address,
            _tokenB: address,
            _price: '123',
            _scale: '3',
            _remainingGasTo: address,
          })
          .send({ amount: locklift.utils.toNano(10), from: address }),
      );

      return expect(traceTree)
        .to.call('setPriceAndScale')
        .count(1)
        .withNamedArgs({
          _tokenA: address,
          _tokenB: address,
          _price: '123',
          _scale: '3',
          _remainingGasTo: address,
        });
    });
  });

  describe('check callbacks', () => {
    it('should return on price received callback', async () => {
      const { traceTree } = await locklift.tracing.trace(
        callbacksExample.methods
          .makeRequest({
            _eventData: EmptyEthereumEventData,
            _tokenA: address,
            _tokenB: address,
            _remainingGasTo: address,
          })
          .send({ amount: locklift.utils.toNano(10), from: address }),
      );

      return expect(traceTree)
        .to.call('makeRequest')
        .count(2)
        .and.to.call('onPriceReceived')
        .count(1)
        .withNamedArgs({
          _baseTokenRoot: address,
          _quoteTokenRoot: address,
          _price: '123',
          _roundId: '0',
          _callbackRequester: callbacksExample.address,
          _scale: '3',
          _payload: TvmCellWithSigner0,
        });
    });

    it('should return on price rejected callback', async () => {
      const { traceTree } = await locklift.tracing.trace(
        callbacksExample.methods
          .makeRequest({
            _eventData: EmptyEthereumEventData,
            _tokenA: zeroAddress,
            _tokenB: address,
            _remainingGasTo: address,
          })
          .send({ amount: locklift.utils.toNano(10), from: address }),
      );

      return expect(traceTree)
        .to.call('makeRequest')
        .count(2)
        .and.to.call('onPriceRejected')
        .count(1)
        .withNamedArgs({
          _baseTokenRoot: zeroAddress,
          _quoteTokenRoot: address,
          _callbackRequester: callbacksExample.address,
          _payload: TvmCellWithSigner0,
        });
    });
  });
});
