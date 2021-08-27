import React from 'react'
import { Button, Flex, Modal } from '@pancakeswap-libs/uikit'
import { castVote } from 'utils/alphaGovernor'

interface VoteNowModalProps {
    proposalId?: any
    onDismiss?:()=>void
}   

const VoteNowModal: React.FC<VoteNowModalProps> = ({ onDismiss,proposalId }) => {
    const handleFavour = async () => {
        await castVote(proposalId, true)
    }

    const handleUnFavour = async () => {
        await castVote(proposalId, false)
    }

    return (
        <Modal title="Vote"  onDismiss={()=>{onDismiss()}}>
            <Flex>
                <Button onClick={handleFavour} style={{ marginRight: '10px' }}>Favour</Button>
                <Button onClick={handleUnFavour}>UnFavour</Button>

            </Flex>
        </Modal>
    )
}

export default VoteNowModal
