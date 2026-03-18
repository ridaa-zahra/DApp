// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract KYCRegistry_RidaZahra {

    address public admin;

    constructor() {
        admin = msg.sender;
    }

    enum KycStatus {
        None,
        Pending,
        Approved,
        Rejected
    }

    struct User {
        string name;
        string cnic;
        bool isVerified;
        bool exists;
        KycStatus status;
    }

    mapping(address => User) public users;

    address[] private pending;
    mapping(address => uint256) private pendingIndexPlusOne; // 0 => not pending

    event KYCSubmitted(address indexed user, string name, string cnic);
    event KYCApproved(address indexed user);
    event KYCRejected(address indexed user);

    function submitKYC(string memory _name, string memory _cnic) public {
        User storage u = users[msg.sender];
        u.name = _name;
        u.cnic = _cnic;
        u.isVerified = false;
        u.exists = true;
        u.status = KycStatus.Pending;

        if (pendingIndexPlusOne[msg.sender] == 0) {
            pending.push(msg.sender);
            pendingIndexPlusOne[msg.sender] = pending.length; // index+1
        }

        emit KYCSubmitted(msg.sender, _name, _cnic);
    }

    function approveKYC(address _user) public {
        require(msg.sender == admin, "Only admin");
        require(users[_user].exists, "No KYC record");
        users[_user].isVerified = true;
        users[_user].status = KycStatus.Approved;
        _removePending(_user);
        emit KYCApproved(_user);
    }

    function rejectKYC(address _user) public {
        require(msg.sender == admin, "Only admin");
        require(users[_user].exists, "No KYC record");
        users[_user].isVerified = false;
        users[_user].status = KycStatus.Rejected;
        _removePending(_user);
        emit KYCRejected(_user);
    }

    function isVerified(address _user) public view returns(bool) {
        return users[_user].isVerified;
    }

    function getPendingRequests()
        public
        view
        returns (address[] memory addrs, string[] memory names, string[] memory cnics)
    {
        uint256 n = pending.length;
        addrs = new address[](n);
        names = new string[](n);
        cnics = new string[](n);

        for (uint256 i = 0; i < n; i++) {
            address a = pending[i];
            User storage u = users[a];
            addrs[i] = a;
            names[i] = u.name;
            cnics[i] = u.cnic;
        }
    }

    function _removePending(address _user) internal {
        uint256 idxPlusOne = pendingIndexPlusOne[_user];
        if (idxPlusOne == 0) return;

        uint256 idx = idxPlusOne - 1;
        uint256 lastIdx = pending.length - 1;

        if (idx != lastIdx) {
            address last = pending[lastIdx];
            pending[idx] = last;
            pendingIndexPlusOne[last] = idx + 1;
        }

        pending.pop();
        pendingIndexPlusOne[_user] = 0;
    }
}