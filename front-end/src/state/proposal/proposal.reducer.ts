import LocalStores from 'config/LocalStores';
import { getLocalStore } from 'utils/localStorage';
import PUBLISH_DATA from './proposal.type';


const INITIAL_STATE = {
    // data: getLocalStore(LocalStores.PROPOSAL_DATA) ?? []
    data: []
}

const proposalReducer = (state = INITIAL_STATE, action) => {
    switch (action.type) {
        case PUBLISH_DATA:
            return {
                ...state,
                data: action.payload.list,
            }

        default:
            return state
    }
};

export default proposalReducer;