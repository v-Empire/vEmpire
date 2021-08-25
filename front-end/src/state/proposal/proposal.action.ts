import PUBLISH_DATA from './proposal.type';

const getProposalList = (list) => {
    return {
        type: PUBLISH_DATA,
        payload: {
            list
        },
    };
};


export default getProposalList;