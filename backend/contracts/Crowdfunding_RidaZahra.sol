// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./KYCRegistry_RidaZahra.sol";

contract Crowdfunding_RidaZahra {

    KYCRegistry_RidaZahra public kyc;

    constructor(address _kycAddress) {
        kyc = KYCRegistry_RidaZahra(_kycAddress);
    }

    struct Campaign {
        string title;
        string description;
        uint goal;
        uint fundsRaised;
        address creator;
        bool completed;
        bool withdrawn;
    }

    Campaign[] public campaigns;

    event CampaignCreated(uint id, string title, address creator);
    event ContributionReceived(uint indexed id, address indexed contributor, uint amount, uint totalRaised);
    event CampaignCompleted(uint indexed id, uint totalRaised);
    event FundsWithdrawn(uint indexed id, address indexed creator, uint amount);

    function createCampaign(
        string memory _title,
        string memory _description,
        uint _goal
    ) public {
        require(kyc.isVerified(msg.sender) || msg.sender == kyc.admin(), "Not verified");
        require(_goal > 0, "Goal must be > 0");

        campaigns.push(Campaign(
            _title,
            _description,
            _goal,
            0,
            msg.sender,
            false,
            false
        ));

        emit CampaignCreated(campaigns.length - 1, _title, msg.sender);
    }

    function contribute(uint _id) public payable {
        Campaign storage c = campaigns[_id];

        require(!c.completed, "Campaign completed");
        require(!c.withdrawn, "Campaign withdrawn");
        require(msg.value > 0, "Zero contribution");

        c.fundsRaised += msg.value;
        emit ContributionReceived(_id, msg.sender, msg.value, c.fundsRaised);

        if (c.fundsRaised >= c.goal) {
            c.completed = true;
            emit CampaignCompleted(_id, c.fundsRaised);
        }
    }

    function withdraw(uint _id) public {
        Campaign storage c = campaigns[_id];

        require(msg.sender == c.creator, "Not creator");
        require(c.completed, "Not completed");
        require(!c.withdrawn, "Already withdrawn");

        payable(msg.sender).transfer(c.fundsRaised);
        c.withdrawn = true;
        emit FundsWithdrawn(_id, msg.sender, c.fundsRaised);
    }

    function getCampaigns() public view returns(Campaign[] memory) {
        return campaigns;
    }
}