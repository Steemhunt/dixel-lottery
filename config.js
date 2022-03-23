import tipABI from "./abi/tipABI.json";
import dixelABI from "./abi/dixelABI.json";
import nftABI from "./abi/nftABI.json";

const CONFIG = {
  tip: {
    contract: "0x7388d9AC06a49A2e52B3fB34374C83f4C1df1081",
    abi: tipABI,
  },
  nft: {
    contract: "0x9F2659b0D2baD4C1D57819df58787cDFd391E3dF",
    abi: nftABI,
  },
  dixel: {
    contract: "0x5d6FB69Bf26090aDc60e1567f05947c486773f57",
    abi: dixelABI,
  },
};

export default CONFIG;
