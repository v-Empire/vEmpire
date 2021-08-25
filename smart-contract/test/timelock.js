const {
    encodeParameters,
    etherUnsigned,
    freezeTime,
    keccak256
} = require('../Utils/Ethereum');

const { accounts, contract, privateKeys } = require('@openzeppelin/test-environment');

const { BN, expectRevert, time, expectEvent, constants } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');
const { signTypedData } = require('eth-sig-util');
const { increase } = require('@openzeppelin/test-helpers/src/time');
const { default: BigNumber } = require('bignumber.js');
const TimeLock = contract.fromArtifact('Timelock');
const MockTimeLockTesting = contract.fromArtifact('MockTimeLockTesting');

const oneWeekInSeconds = etherUnsigned(7 * 24 * 60 * 60);
const zero = etherUnsigned(0);
const gracePeriod = oneWeekInSeconds.multipliedBy(2);

describe('Timelock', function () {
    let root, notAdmin, newAdmin;
    let blockTimestamp;
    let timelock;
    let delay = oneWeekInSeconds;
    let newDelay = delay.multipliedBy(2);
    let target;
    let value = zero;
    let signature = 'setDelay(uint256)';
    let data = encodeParameters(['uint256'], [50000]);
    let revertData = encodeParameters(['uint256'], [50000000000]);
    let eta;
    let queuedTxHash;

    describe('TimeLock', function () {
        const [root, notAdmin, newAdmin] = accounts;
        const [rootPrivateKey, notAdminPrivateKey, newAdminPrivateKey] = privateKeys;
        
        beforeEach(async function () {
            this.timelock = await TimeLock.new(root, delay, { from: root, gas: 8000000 });
            this.mockTimeLock = await MockTimeLockTesting.new({ from: root, gas: 8000000 });

            blockTimestamp = etherUnsigned(100);
            
            // await freezeTime(blockTimestamp.toNumber())
            target = this.timelock.address;
            eta = blockTimestamp.plus(delay)
        });


        describe('constructor', function () {
            it('sets address of admin', async function () {
                let configuredAdmin = await this.timelock.admin();
                expect(configuredAdmin).to.be.equal(root);
            });

            it('sets delay', async function () {
                let configuredDelay = await this.timelock.delay();
                expect(configuredDelay).to.be.bignumber.equal(new BN(604800));
            });
        });

        describe('setDelay', function () {
            it('requires msg.sender to be Timelock', async function () {
                await expectRevert(this.timelock.setDelay(delay, { from: root }), 'Timelock::setDelay: Call must come from Timelock.');
            });
        });

        describe('setPendingAdmin', function () {
            it('requires msg.sender to be Timelock', async function () {
                await expectRevert(
                    this.timelock.setPendingAdmin(newAdmin, { from: notAdmin })
                    , 'Timelock::setPendingAdmin: First call must come from admin.');
            });
        });

        describe('acceptAdmin', function () {
            it('requires msg.sender to be pendingAdmin', async function () {
                await this.timelock.setPendingAdmin(root, { from: root });
                await expectRevert(
                    this.timelock.acceptAdmin({ from: notAdmin })
                    , 'Timelock::acceptAdmin: Call must come from pendingAdmin.');
            });

            it('sets pendingAdmin to address 0 and changes admin', async function () {
                await this.timelock.setPendingAdmin(newAdmin, { from: root });
                const pendingAdminBefore = await this.timelock.pendingAdmin();
                expect(pendingAdminBefore).to.be.equal(newAdmin);

                const result = await this.timelock.acceptAdmin({ from: newAdmin });
                const pendingAdminAfter = await this.timelock.pendingAdmin();
                expect(pendingAdminAfter).to.be.equal('0x0000000000000000000000000000000000000000');

                const timelockAdmin = await this.timelock.admin();
                expect(timelockAdmin).to.be.equal(newAdmin);
            });
        });

        describe('queueTransaction', function () {
            it('requires admin to be msg.sender', async function () {
                await expectRevert(
                    this.timelock.queueTransaction(target, value, signature, data, eta, { from: notAdmin })
                    , 'Timelock::queueTransaction: Call must come from admin.');
            });

            it('requires eta to exceed delay', async function () {
                const etaLessThanDelay = blockTimestamp.plus(delay).minus(1);

                await expectRevert(
                    this.timelock.queueTransaction(target, value, signature, data, etaLessThanDelay, {
                        from: root
                    })
                    , 'Timelock::queueTransaction: Estimated execution block must satisfy delay.');
            });

            it('sets hash as true in queuedTransactions mapping', async function () {
                eta = Date.now(); // Unix timestamp in milliseconds
                queuedTxHash = keccak256(
                    encodeParameters(
                        ['address', 'uint256', 'string', 'bytes', 'uint256'],
                        [target, value.toString(), signature, data, eta.toString()]
                    )
                );

                const queueTransactionsHashValueBefore = await this.timelock.queuedTransactions(queuedTxHash);
                expect(queueTransactionsHashValueBefore).to.be.equal(false);

                await this.timelock.queueTransaction(target, value, signature, data, eta, { from: root });

                const queueTransactionsHashValueAfter = await this.timelock.queuedTransactions(queuedTxHash);
                expect(queueTransactionsHashValueAfter).to.be.equal(true);
            });
        });

        describe('cancelTransaction', function () {
            beforeEach(async function () {
                eta = Date.now(); // Unix timestamp in milliseconds
                queuedTxHash = keccak256(
                    encodeParameters(
                        ['address', 'uint256', 'string', 'bytes', 'uint256'],
                        [target, value.toString(), signature, data, eta.toString()]
                    )
                );
                await this.timelock.queueTransaction(target, value, signature, data, eta, { from: root });
            });

            it('requires admin to be msg.sender', async function () {
                await expectRevert(
                    this.timelock.cancelTransaction(target, value, signature, data, eta, { from: notAdmin })
                    , 'Timelock::cancelTransaction: Call must come from admin.');
            });

            it('sets hash from true to false in queuedTransactions mapping', async function () {
                const queueTransactionsHashValueBefore = await this.timelock.queuedTransactions(queuedTxHash);
                expect(queueTransactionsHashValueBefore).to.be.equal(true);

                await this.timelock.cancelTransaction(target, value, signature, data, eta, { from: root });

                const queueTransactionsHashValueAfter = await this.timelock.queuedTransactions(queuedTxHash);
                expect(queueTransactionsHashValueAfter).to.be.equal(false);
            });
        });

        describe('queue and cancel empty', function () {
            it('can queue and cancel an empty signature and data', async function () {
                eta = Date.now(); // Unix timestamp in milliseconds
                const txHash = keccak256(
                    encodeParameters(
                        ['address', 'uint256', 'string', 'bytes', 'uint256'],
                        [target, value.toString(), '', '0x', eta.toString()]
                    )
                );
                expect(await this.timelock.queuedTransactions(txHash)).to.be.equal(false);
                await this.timelock.queueTransaction(target, value, '', '0x', eta, { from: root });
                expect(await this.timelock.queuedTransactions(txHash)).to.be.equal(true);
                await this.timelock.cancelTransaction(target, value, '', '0x', eta, { from: root });
                expect(await this.timelock.queuedTransactions(txHash)).to.be.equal(false);
            });
        });

        describe('executeTransaction (setDelay)', function () {
            beforeEach(async function () {
                // Queue transaction that will succeed
                eta = Date.now(); // Unix timestamp in milliseconds
                eta = eta + parseInt(delay);
                await this.timelock.queueTransaction(target, value, signature, data, eta, {
                    from: root
                });

                await this.timelock.queueTransaction(target, value, signature, revertData, eta, {
                    from: root
                });
            });

            it('requires admin to be msg.sender', async function () {
                await expectRevert(
                    this.timelock.executeTransaction(target, value, signature, data, eta, { from: notAdmin })
                    , 'Timelock::executeTransaction: Call must come from admin.');
            });

            it('requires transaction to be queued', async function () {
                const differentEta = eta + 10;
                await expectRevert(
                    this.timelock.executeTransaction(target, value, signature, data, differentEta, { from: root })
                    , "revert Timelock::executeTransaction: Transaction hasn't been queued.");
            });

            it('requires timestamp to be greater than or equal to eta', async function () {
                await expectRevert(
                    this.timelock.executeTransaction(target, value, signature, data, eta, {
                        from: root
                    })
                    , "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
                );
            });

            it('sets hash from true to false in queuedTransactions mapping, updates delay, and emits ExecuteTransaction event', async function () {
                const configuredDelayBefore = await this.timelock.delay();
                expect(configuredDelayBefore).to.be.bignumber.equal(new BN(604800));

                queuedTxHash = keccak256(
                    encodeParameters(
                        ['address', 'uint256', 'string', 'bytes', 'uint256'],
                        [target, value.toString(), signature, data, eta.toString()]
                    )
                );

                const queueTransactionsHashValueBefore = await this.timelock.queuedTransactions(queuedTxHash);
                expect(queueTransactionsHashValueBefore).to.be.equal(true);
                await time.increaseTo(eta + parseInt(604800));

                const result = await this.timelock.executeTransaction(target, value, signature, data, eta, {
                    from: root
                });

                const queueTransactionsHashValueAfter = await this.timelock.queuedTransactions(queuedTxHash);
                expect(queueTransactionsHashValueAfter).to.be.equal(false);

                const configuredDelayAfter = await this.timelock.delay();
                expect(configuredDelayAfter).to.be.bignumber.equal(new BN(50000));
            });   
        });

        describe('executeTransaction (setPendingAdmin)', function () {
            beforeEach(async function () {
                
                const configuredDelay = await this.timelock.delay();

                delay = etherUnsigned(configuredDelay);
                signature = 'setPendingAdmin(address)';
                data = encodeParameters(['address'], [newAdmin]);
                eta = Date.now(); // Unix timestamp in milliseconds
                eta = eta + parseInt(delay + parseInt(604800));
                await this.timelock.queueTransaction(target, value, signature, data, eta, {
                    from: root
                });
            });

            it('requires admin to be msg.sender', async function () {
                await expectRevert(
                    this.timelock.executeTransaction(target, value, signature, data, eta, { from: notAdmin })
                , 'Timelock::executeTransaction: Call must come from admin.');
            });

            it('requires transaction to be queued', async function () {
                const differentEta = eta + 1;
                await expectRevert(
                    this.timelock.executeTransaction(target, value, signature, data, differentEta, { from: root })
                , "Timelock::executeTransaction: Transaction hasn't been queued.");
            });

            it('requires timestamp to be greater than or equal to eta', async function () {
                await expectRevert(
                    this.timelock.executeTransaction(target, value, signature, data, eta, {
                        from: root
                    })
                , "Timelock::executeTransaction: Transaction hasn't surpassed time lock."
                );
            });
        });

        describe('executeTransaction success (setPendingAdmin)', function () {
            beforeEach(async function () {
                
                const configuredDelay = await this.timelock.delay();

                delay = etherUnsigned(configuredDelay);
                signature = 'setPendingAdmin(address)';
                data = encodeParameters(['address'], [newAdmin]);
                eta = Date.now(); // Unix timestamp in milliseconds
                eta = eta + parseInt(delay + parseInt(604800));
                await this.timelock.queueTransaction(this.mockTimeLock.address, value, signature, data, eta, {
                    from: root
                });
            });

            it('sets hash from true to false in queuedTransactions mapping, updates admin, and emits ExecuteTransaction event', async function () {
                queuedTxHash = keccak256(
                    encodeParameters(
                        ['address', 'uint256', 'string', 'bytes', 'uint256'],
                        [this.mockTimeLock.address, value.toString(), signature, data, eta.toString()]
                    )
                );
                
                const queueTransactionsHashValueBefore = await this.timelock.queuedTransactions(queuedTxHash);
                expect(queueTransactionsHashValueBefore).to.be.equal(true);

                await time.increaseTo(eta + parseInt(604800));
                
                const result = await this.timelock.executeTransaction(this.mockTimeLock.address, value, signature, data, eta, {
                    from: root
                });
                
                const queueTransactionsHashValueAfter = await this.timelock.queuedTransactions(queuedTxHash);
                expect(queueTransactionsHashValueAfter).to.be.equal(false);
               
                const configuredPendingAdminAfter = await this.mockTimeLock.pendingAdmin();
                expect(configuredPendingAdminAfter).to.be.equal(newAdmin);
            });
        });
    });
});