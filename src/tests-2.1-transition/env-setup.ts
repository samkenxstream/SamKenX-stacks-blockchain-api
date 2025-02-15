import { loadDotEnv } from '../helpers';
import { StacksCoreRpcClient } from '../core-rpc/client';
import { PgWriteStore } from '../datastore/pg-write-store';
import { ApiServer, startApiServer } from '../api/init';
import { ChainID } from '@stacks/transactions';
import { StacksNetwork, StacksTestnet } from '@stacks/network';
import { RPCClient } from 'rpc-bitcoin';

export interface TestEnvContext {
  db: PgWriteStore;
  api: ApiServer;
  client: StacksCoreRpcClient;
  stacksNetwork: StacksNetwork;
  bitcoinRpcClient: RPCClient;
}

let testEnv: TestEnvContext;

beforeAll(async () => {
  console.log('Jest - setup..');
  if (!process.env.NODE_ENV) {
    process.env.NODE_ENV = 'test';
  }
  loadDotEnv();

  process.env.PG_DATABASE = 'postgres';
  process.env.STACKS_CHAIN_ID = '0x80000000';

  const db = await PgWriteStore.connect({ usageName: 'tests' });
  const api = await startApiServer({ datastore: db, chainId: ChainID.Testnet });
  const client = new StacksCoreRpcClient();
  const stacksNetwork = new StacksTestnet({ url: `http://${client.endpoint}` });

  const { BTC_RPC_PORT, BTC_RPC_HOST, BTC_RPC_PW, BTC_RPC_USER } = process.env;
  if (!BTC_RPC_PORT || !BTC_RPC_HOST || !BTC_RPC_PW || !BTC_RPC_USER) {
    throw new Error('Bitcoin JSON-RPC env vars not fully configured.');
  }
  const bitcoinRpcClient = new RPCClient({
    url: BTC_RPC_HOST,
    port: Number(BTC_RPC_PORT),
    user: BTC_RPC_USER,
    pass: BTC_RPC_PW,
    timeout: 120000,
    wallet: '',
  });

  testEnv = {
    db,
    api,
    client,
    stacksNetwork,
    bitcoinRpcClient,
  };
  Object.assign(global, { testEnv });

  console.log('Jest - setup done');
});

afterAll(async () => {
  console.log('Jest - teardown..');
  await testEnv.api.terminate();
  await testEnv.db?.close();
  console.log('Jest - teardown done');
});
