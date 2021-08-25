import React from 'react'
import { Button, Flex, Modal } from '@pancakeswap-libs/uikit'
import { castVote } from 'utils/alphaGovernor'

const VoteNowModal = () => {
    const handleFavour = async () => {
        await castVote(1, true)
    }

    const handleUnFavour = async () => {
        await castVote(1, false)
    }

    return (
        <Modal title="Vote" >
            <Flex>
                <Button onClick={handleFavour} style={{ marginRight: '10px' }}>Favour</Button>
                <Button onClick={handleUnFavour}>UnFavour</Button>

            </Flex>
        </Modal>
    )
}

export default VoteNowModal
