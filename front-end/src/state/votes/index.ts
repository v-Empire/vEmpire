/* eslint-disable no-param-reassign */
import { createSlice } from '@reduxjs/toolkit'
import VotesConfig from 'config/constants/votes'
import fetchVote from './fetchVote'
import {
  fetchFarmUserEarnings,
  fetchFarmUserAllowances,
  fetchFarmUserTokenBalances,
  fetchFarmUserStakedBalances,
} from './fetchVoteUser'
import {VotesState, Vote } from '../types'

const initialState: VotesState = { data: [...VotesConfig] }

export const VoteSlice = createSlice({
  name: 'Votes',
  initialState,
  reducers: {
    setVotePublicData: (state, action) => {
      const liveFarmsData: Vote[] = action.payload
      state.data = state.data.map((vote) => {
        const liveFarmData = liveFarmsData.find((f) => f.pid === vote.pid)
        return { ...vote, ...liveFarmData }
      })
    },
    setVoteUserData: (state, action) => {
      const { arrayOfUserDataObjects } = action.payload
      arrayOfUserDataObjects.forEach((userDataEl) => {
        const { index } = userDataEl
        state.data[index] = { ...state.data[index], userData: userDataEl }
      })
    },
  },
})

// Actions
export const { setVotePublicData, setVoteUserData } = VoteSlice.actions

// Thunks
export const fetchVotePublicDataAsync = () => async (dispatch) => {
  const farms = await fetchVote()
  dispatch(setVotePublicData(farms))
}
export const fetchVoteUserDataAsync = (account) => async (dispatch) => {


  const userFarmAllowances = await fetchFarmUserAllowances(account)
  const userFarmTokenBalances = await fetchFarmUserTokenBalances(account)
  const userStakedBalances = await fetchFarmUserStakedBalances(account)
  const userFarmEarnings = await fetchFarmUserEarnings(account)

  const arrayOfUserDataObjects = userFarmAllowances.map((farmAllowance, index) => {
    return {
      index,
      allowance: userFarmAllowances[index],
      tokenBalance: userFarmTokenBalances[index],
      stakedBalance: userStakedBalances[index],
      earnings: userFarmEarnings[index],
    }
  })

  dispatch(setVoteUserData({ arrayOfUserDataObjects }))
}

export default VoteSlice.reducer
