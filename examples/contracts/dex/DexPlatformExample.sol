pragma ever-solidity >= 0.63.0;

pragma AbiHeader time;
pragma AbiHeader expire;
pragma AbiHeader pubkey;

import "@fairyfromalfeya/ever-solidity-utils/contracts/libraries/UtilityFlag.sol";
import "@fairyfromalfeya/ever-solidity-utils/contracts/libraries/UtilityGas.sol";
import "@fairyfromalfeya/ever-solidity-utils/contracts/reservation/abstract/Reservable.sol";
import "@fairyfromalfeya/ever-solidity-utils/contracts/validation/abstract/Validatable.sol";

import "../../../contracts/dex/libraries/DexPlatformTypes.sol";
import "../../../contracts/dex/DexPlatformMinimized.sol";

contract DexPlatformExample is Reservable, Validatable {
    uint32 private static _nonce;

    constructor(optional(address) _remainingGasTo)
        public
        reserveAcceptAndRefund(UtilityGas.INITIAL_BALANCE, _remainingGasTo, msg.sender)
    {}

    function getPairAddress(
        TvmCell _platformCode,
        address _root,
        address _left,
        address _right
    )
        external
        pure
        responsible
        returns (address)
    {
        TvmBuilder builder;

        builder.store(_left);
        builder.store(_right);

        return {
            value: 0,
            flag: UtilityFlag.REMAINING_GAS,
            bounce: false
        } address(
            tvm.hash(
                tvm.buildStateInit({
                    code: _platformCode,
                    contr: DexPlatformMinimized,
                    pubkey: 0,
                    varInit: {
                        root: _root,
                        type_id: DexPlatformTypes.POOL,
                        params: builder.toCell()
                    }
                })
            )
        );
    }
}
