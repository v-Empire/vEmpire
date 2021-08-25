import { configureStore } from '@reduxjs/toolkit'
import farmsReducer from './farms'
import poolsReducer from './pools'
import proposalReducer from './proposal/proposal.reducer'
import VoteReducer from './votes'

export default configureStore({
  devTools: process.env.NODE_ENV !== 'production',
  reducer: {
    farms: farmsReducer,
    pools: poolsReducer,
    votes: VoteReducer,
    proposalData: proposalReducer
  },
})
