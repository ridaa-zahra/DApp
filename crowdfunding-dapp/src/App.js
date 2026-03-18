import './App.css';
import { useEffect, useMemo, useState } from "react";
import { BrowserProvider, Contract, formatEther, parseEther } from "ethers";
import { ADDRESSES, CROWDFUNDING_ABI, KYC_ABI } from "./contracts";

function App() {
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [address, setAddress] = useState("");
  const [balance, setBalance] = useState("");
  const [chainId, setChainId] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const [kycName, setKycName] = useState("");
  const [kycCnic, setKycCnic] = useState("");
  const [isVerified, setIsVerified] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminAddressToManage, setAdminAddressToManage] = useState("");
  const [pendingRequests, setPendingRequests] = useState([]);

  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newGoalEth, setNewGoalEth] = useState("");
  const [campaigns, setCampaigns] = useState([]);

  const kyc = useMemo(() => {
    if (!signer) return null;
    return new Contract(ADDRESSES.KYC, KYC_ABI, signer);
  }, [signer]);

  const crowdfunding = useMemo(() => {
    if (!signer) return null;
    return new Contract(ADDRESSES.CROWDFUNDING, CROWDFUNDING_ABI, signer);
  }, [signer]);

  async function connect() {
    setError("");
    setStatus("");
    if (!window.ethereum) {
      setError("MetaMask not found. Install MetaMask first.");
      return;
    }
    const p = new BrowserProvider(window.ethereum);
    await p.send("eth_requestAccounts", []);
    const net = await p.getNetwork();
    const cid = net?.chainId?.toString?.() || String(net?.chainId || "");
    setChainId(cid);
    if (cid && cid !== "31337") {
      setProvider(null);
      setSigner(null);
      setAddress("");
      setBalance("");
      setIsVerified(false);
      setIsAdmin(false);
      setCampaigns([]);
      setPendingRequests([]);
      setError("Wrong network. Switch MetaMask to Hardhat Localhost (ChainId 31337), then click Connect again.");
      return;
    }
    const s = await p.getSigner();
    const a = await s.getAddress();
    const b = await p.getBalance(a);
    setProvider(p);
    setSigner(s);
    setAddress(a);
    setBalance(formatEther(b));
  }

  async function refreshAccount() {
    if (!provider || !address) return;
    const b = await provider.getBalance(address);
    setBalance(formatEther(b));
  }

  async function refreshKycAndAdmin() {
    if (!provider || !address) return;
    const readKyc = new Contract(ADDRESSES.KYC, KYC_ABI, provider);
    try {
      const admin = await readKyc.admin();
      const verified = await readKyc.isVerified(address);
      setIsVerified(Boolean(verified));
      setIsAdmin(admin.toLowerCase() === address.toLowerCase());
    } catch (e) {
      setIsVerified(false);
      setIsAdmin(false);
    }
  }

  async function loadPendingRequests() {
    if (!provider) return;
    if (!KYC_ABI?.length) return;
    const readKyc = new Contract(ADDRESSES.KYC, KYC_ABI, provider);
    try {
      const [addrs, names, cnics] = await readKyc.getPendingRequests();
      const rows = addrs.map((a, i) => ({
        address: a,
        name: names[i],
        cnic: cnics[i],
      }));
      setPendingRequests(rows);
    } catch (e) {
      // Older contract ABI may not have this function; ignore.
      setPendingRequests([]);
    }
  }

  async function loadCampaigns() {
    if (!provider) return;
    const readCf = new Contract(ADDRESSES.CROWDFUNDING, CROWDFUNDING_ABI, provider);
    let list = [];
    try {
      list = await readCf.getCampaigns();
    } catch (e) {
      setCampaigns([]);
      return;
    }
    const normalized = list.map((c, idx) => ({
      id: idx,
      title: c.title,
      description: c.description,
      goal: c.goal,
      fundsRaised: c.fundsRaised,
      creator: c.creator,
      completed: c.completed,
      withdrawn: c.withdrawn,
    }));
    setCampaigns(normalized);
  }

  useEffect(() => {
    if (!window.ethereum) return;
    const onAccountsChanged = () => {
      setProvider(null);
      setSigner(null);
      setAddress("");
      setBalance("");
      setChainId("");
      setIsVerified(false);
      setIsAdmin(false);
      setCampaigns([]);
      setPendingRequests([]);
      setStatus("Account changed. Please reconnect.");
    };
    const onChainChanged = () => {
      setProvider(null);
      setSigner(null);
      setAddress("");
      setBalance("");
      setChainId("");
      setIsVerified(false);
      setIsAdmin(false);
      setCampaigns([]);
      setPendingRequests([]);
      setStatus("Network changed. Please reconnect.");
      setError("");
    };
    window.ethereum.on?.("accountsChanged", onAccountsChanged);
    window.ethereum.on?.("chainChanged", onChainChanged);
    return () => {
      window.ethereum.removeListener?.("accountsChanged", onAccountsChanged);
      window.ethereum.removeListener?.("chainChanged", onChainChanged);
    };
  }, []);

  useEffect(() => {
    if (!provider || !address) return;
    refreshKycAndAdmin();
    loadCampaigns();
    loadPendingRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider, address]);

  useEffect(() => {
    if (!provider) return;
    const readCf = new Contract(ADDRESSES.CROWDFUNDING, CROWDFUNDING_ABI, provider);
    const handler = () => loadCampaigns();
    readCf.on("CampaignCreated", handler);
    readCf.on("ContributionReceived", handler);
    readCf.on("CampaignCompleted", handler);
    readCf.on("FundsWithdrawn", handler);
    return () => {
      readCf.off("CampaignCreated", handler);
      readCf.off("ContributionReceived", handler);
      readCf.off("CampaignCompleted", handler);
      readCf.off("FundsWithdrawn", handler);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  useEffect(() => {
    if (!provider) return;
    const readKyc = new Contract(ADDRESSES.KYC, KYC_ABI, provider);
    const handler = () => loadPendingRequests();
    try {
      readKyc.on("KYCSubmitted", handler);
      readKyc.on("KYCApproved", handler);
      readKyc.on("KYCRejected", handler);
    } catch (e) {
      // ignore if ABI missing
    }
    return () => {
      try {
        readKyc.off("KYCSubmitted", handler);
        readKyc.off("KYCApproved", handler);
        readKyc.off("KYCRejected", handler);
      } catch (e) {
        // ignore
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  async function submitKyc(e) {
    e.preventDefault();
    if (!kyc) return;
    setError("");
    setStatus("Submitting KYC...");
    try {
      const tx = await kyc.submitKYC(kycName, kycCnic);
      await tx.wait();
      setStatus("KYC submitted.");
      setKycName("");
      setKycCnic("");
      await refreshKycAndAdmin();
      await loadPendingRequests();
    } catch (err) {
      setError(err?.shortMessage || err?.message || String(err));
      setStatus("");
    }
  }

  async function adminApprove() {
    if (!kyc) return;
    setError("");
    setStatus("Approving KYC...");
    try {
      const tx = await kyc.approveKYC(adminAddressToManage);
      await tx.wait();
      setStatus("KYC approved.");
      await refreshKycAndAdmin();
      await loadPendingRequests();
    } catch (err) {
      setError(err?.shortMessage || err?.message || String(err));
      setStatus("");
    }
  }

  async function adminReject() {
    if (!kyc) return;
    setError("");
    setStatus("Rejecting KYC...");
    try {
      const tx = await kyc.rejectKYC(adminAddressToManage);
      await tx.wait();
      setStatus("KYC rejected.");
      await refreshKycAndAdmin();
      await loadPendingRequests();
    } catch (err) {
      setError(err?.shortMessage || err?.message || String(err));
      setStatus("");
    }
  }

  async function createCampaign(e) {
    e.preventDefault();
    if (!crowdfunding) return;
    setError("");
    setStatus("Creating campaign...");
    try {
      const goalWei = parseEther(newGoalEth || "0");
      const tx = await crowdfunding.createCampaign(newTitle, newDesc, goalWei);
      await tx.wait();
      setStatus("Campaign created.");
      setNewTitle("");
      setNewDesc("");
      setNewGoalEth("");
      await loadCampaigns();
    } catch (err) {
      setError(err?.shortMessage || err?.message || String(err));
      setStatus("");
    }
  }

  async function contribute(id, ethAmount) {
    if (!crowdfunding) return;
    setError("");
    setStatus("Sending contribution...");
    try {
      const tx = await crowdfunding.contribute(id, { value: parseEther(ethAmount) });
      await tx.wait();
      setStatus("Contribution confirmed.");
      await loadCampaigns();
      await refreshAccount();
    } catch (err) {
      setError(err?.shortMessage || err?.message || String(err));
      setStatus("");
    }
  }

  async function withdraw(id) {
    if (!crowdfunding) return;
    setError("");
    setStatus("Withdrawing funds...");
    try {
      const tx = await crowdfunding.withdraw(id);
      await tx.wait();
      setStatus("Withdraw confirmed.");
      await loadCampaigns();
      await refreshAccount();
    } catch (err) {
      setError(err?.shortMessage || err?.message || String(err));
      setStatus("");
    }
  }

  return (
    <div className="App">
      <div className="App-header" style={{ maxWidth: 980, margin: "0 auto", alignItems: "stretch" }}>
        <h2 style={{ marginBottom: 6 }}>Crowdfunding DApp</h2>
        <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
          Developed by <b>Rida Zahra</b>, Roll No: <b>22L-6756</b>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center", justifyContent: "center" }}>
          <button onClick={connect} style={{ padding: "10px 14px", cursor: "pointer" }}>
            {address ? "Connected" : "Connect MetaMask"}
          </button>
          {address ? (
            <div style={{ textAlign: "left" }}>
              <div><b>Address:</b> {address}</div>
              <div><b>Balance:</b> {balance} ETH</div>
              <div><b>ChainId:</b> {chainId || "?"}</div>
              <div><b>KYC:</b> {isVerified ? "Verified" : "Not verified"}</div>
              <div><b>Role:</b> {isAdmin ? "Admin" : "User"}</div>
            </div>
          ) : null}
        </div>

        {status ? <div style={{ marginTop: 10, color: "#c7f9cc" }}><b>{status}</b></div> : null}
        {error ? <div style={{ marginTop: 10, color: "#ffb3b3" }}><b>Error:</b> {error}</div> : null}

        <hr style={{ width: "100%", margin: "18px 0", opacity: 0.3 }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div style={{ textAlign: "left" }}>
            <h3>KYC</h3>
            <form onSubmit={submitKyc} style={{ display: "grid", gap: 8 }}>
              <input value={kycName} onChange={(e) => setKycName(e.target.value)} placeholder="Name" required />
              <input value={kycCnic} onChange={(e) => setKycCnic(e.target.value)} placeholder="CNIC" required />
              <button disabled={!signer} type="submit">Submit KYC</button>
            </form>
          </div>

          <div style={{ textAlign: "left" }}>
            <h3>Admin Panel</h3>
            <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
              Admin can approve/reject by entering a user address.
            </div>
            <input
              value={adminAddressToManage}
              onChange={(e) => setAdminAddressToManage(e.target.value)}
              placeholder="User address (0x...)"
              style={{ width: "100%" }}
            />
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <button disabled={!signer || !isAdmin} onClick={adminApprove}>Approve</button>
              <button disabled={!signer || !isAdmin} onClick={adminReject}>Reject</button>
            </div>

            <div style={{ marginTop: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ fontWeight: 700 }}>Pending Requests</div>
                <button onClick={loadPendingRequests} disabled={!provider || !isAdmin}>Refresh</button>
              </div>
              <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>
                Tip: copy the address from this list into the box above, then click Approve/Reject.
              </div>
              <div style={{ marginTop: 8, maxHeight: 160, overflow: "auto", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ textAlign: "left", opacity: 0.9 }}>
                      <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.14)" }}>Address</th>
                      <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.14)" }}>Name</th>
                      <th style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.14)" }}>CNIC</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={3} style={{ padding: 8, opacity: 0.8 }}>No pending requests.</td>
                      </tr>
                    ) : (
                      pendingRequests.map((r) => (
                        <tr key={r.address}>
                          <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{r.address}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{r.name}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid rgba(255,255,255,0.08)" }}>{r.cnic}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <hr style={{ width: "100%", margin: "18px 0", opacity: 0.3 }} />

        <div style={{ textAlign: "left" }}>
          <h3>Create Campaign</h3>
          <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 8 }}>
            Your contract requires KYC verification to create campaigns.
          </div>
          <form onSubmit={createCampaign} style={{ display: "grid", gap: 8 }}>
            <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Title" required />
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" required />
            <input value={newGoalEth} onChange={(e) => setNewGoalEth(e.target.value)} placeholder="Goal (ETH)" required />
            <button disabled={!signer || (!isVerified && !isAdmin)} type="submit">
              Create
            </button>
          </form>
        </div>

        <hr style={{ width: "100%", margin: "18px 0", opacity: 0.3 }} />

        <div style={{ textAlign: "left" }}>
          <h3>Campaigns</h3>
          <button onClick={loadCampaigns} disabled={!provider} style={{ marginBottom: 10 }}>Refresh</button>
          <div style={{ display: "grid", gap: 12 }}>
            {campaigns.map((c) => (
              <CampaignCard
                key={c.id}
                campaign={c}
                connectedAddress={address}
                onContribute={contribute}
                onWithdraw={withdraw}
              />
            ))}
            {provider && campaigns.length === 0 ? <div>No campaigns found.</div> : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function CampaignCard({ campaign, connectedAddress, onContribute, onWithdraw }) {
  const [amountEth, setAmountEth] = useState("0.01");
  const goalEth = formatEther(campaign.goal);
  const raisedEth = formatEther(campaign.fundsRaised);
  const status = campaign.withdrawn ? "Withdrawn" : campaign.completed ? "Completed" : "Active";
  const isCreator =
    connectedAddress &&
    campaign.creator &&
    connectedAddress.toLowerCase() === campaign.creator.toLowerCase();

  return (
    <div style={{ border: "1px solid rgba(255,255,255,0.18)", borderRadius: 12, padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "baseline" }}>
        <div style={{ fontWeight: 700 }}>{campaign.title}</div>
        <div style={{ fontSize: 12, opacity: 0.85 }}><b>{status}</b></div>
      </div>
      <div style={{ marginTop: 6, opacity: 0.9 }}>{campaign.description}</div>
      <div style={{ marginTop: 10, display: "grid", gap: 4, fontSize: 13, opacity: 0.95 }}>
        <div><b>Goal:</b> {goalEth} ETH</div>
        <div><b>Raised:</b> {raisedEth} ETH</div>
        <div><b>Creator:</b> {campaign.creator}</div>
      </div>

      <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <input
          value={amountEth}
          onChange={(e) => setAmountEth(e.target.value)}
          style={{ width: 120 }}
        />
        <button disabled={!connectedAddress || campaign.completed} onClick={() => onContribute(campaign.id, amountEth)}>
          Contribute
        </button>
        <button disabled={!connectedAddress || !isCreator || !campaign.completed || campaign.withdrawn} onClick={() => onWithdraw(campaign.id)}>
          Withdraw
        </button>
      </div>
    </div>
  );
}

export default App;
