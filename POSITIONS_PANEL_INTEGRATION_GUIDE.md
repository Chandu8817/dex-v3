# PositionsPanel Integration Guide

## Installation & Usage

### 1. **Import the Component**

```tsx
import { PositionsPanel } from '@/components/dex/PositionsPanel';
```

### 2. **Use in Your Page/Component**

```tsx
import { useWalletContext } from '@/context/WalletContext'; // or your signer provider

export default function PoolsPage() {
  const { signer } = useWalletContext();

  return (
    <div className="p-6">
      <PositionsPanel signer={signer} />
    </div>
  );
}
```

### 3. **Prerequisites**

Ensure your app has:
- Apollo Client configured with GraphQL endpoint
- wagmi hooks for wallet connection
- Sonner toast provider
- All UI components from `@/components/ui`
- usePositionManager hook available
- useChainId hook from wagmi

### 4. **Required Props**

```typescript
interface Props {
  signer: ethers.JsonRpcSigner | null;
}
```

**Explanation:**
- `signer`: JSON-RPC signer from ethers.js or wagmi
  - Can be `null` if wallet not connected (component handles gracefully)
  - Used to fetch user positions and call contract methods

## Features Breakdown

### Tab 1: Your Positions
**What it shows:**
- User's active liquidity positions
- Summary statistics (total value, uncollected fees, position count)
- Expandable position cards with detailed information

**Actions available:**
- Expand/collapse position details
- View price range visualization
- Collect uncollected fees (button available)
- Increase liquidity (opens modal)
- Remove liquidity (opens modal with warning)
- View on explorer (external link)

**Requirements:**
- Wallet must be connected
- User must have at least one position

### Tab 2: All Pools
**What it shows:**
- All available pools from GraphQL subgraph
- Pool tokens, TVL, and fee tier
- Real-time data

**Actions available:**
- Search pools by token symbol
- "Add LP" button for each pool (ready for integration)

**Features:**
- Sorted by Total Value Locked (descending)
- Paginated query (50 pools per page)
- Loading states during fetch

## Modal: Liquidity Management

### Increase Mode
- Add more liquidity to an existing position
- Both token amounts required
- Maintains existing price range

### Remove Mode
- Remove liquidity from position
- Shows warning about closing position
- Requires amount input
- Ensures user collects fees first

## State Management Flow

```
PositionsPanel
├── selectedPosition (which card is expanded)
├── userPositions (fetched from chain)
├── pools (fetched from GraphQL)
├── activeTab (your / all)
├── isManageModalOpen (modal visibility)
├── selectedPositionForManage (which position to edit)
└── manageMode (increase / remove)
    └── LiquidityManageModal
        ├── Renders modal based on mode
        ├── Handles amount inputs
        └── onClose callback
```

## Styling Customization

### CSS Classes Used
- Tailwind utility classes
- Custom variant classes: `variant="glass"`
- Responsive grid: `grid-cols-1 md:grid-cols-3`
- Color utilities for status badges

### Theme Support
- Dark mode compatible
- Uses CSS variables for theming
- No hardcoded colors (all use Tailwind config)

## API Integration Points

### 1. **Fetch Pools** (Already Integrated)
```typescript
const { data: poolData, loading: isLoadingPools } = useQuery(POOLS_QUERY, {
  variables: {
    first: 50,
    skip: 0,
    orderBy: 'totalValueLockedUSD',
    orderDirection: 'desc',
    where: {},
  },
});
```

### 2. **Fetch User Positions** (Already Integrated)
```typescript
const positions = await getUserPositions(address);
```

### 3. **Increase Liquidity** (Ready for Implementation)
In `LiquidityManageModal.tsx`, update the `handleSubmit` function:
```typescript
const handleSubmit = async () => {
  // TODO: Call increase position contract method
  // Parameters: tokenId, amount0, amount1
};
```

### 4. **Remove Liquidity** (Ready for Implementation)
In `LiquidityManageModal.tsx`, add similar logic for remove mode:
```typescript
if (activeMode === 'remove') {
  // TODO: Call decrease position contract method
  // Parameters: tokenId, liquidity, amount0Min, amount1Min
}
```

### 5. **Collect Fees** (Ready for Implementation)
Update PositionCard "Collect" button:
```typescript
const handleCollectFees = async (position: Position) => {
  // TODO: Call collectFees contract method
  // Parameters: tokenId
};
```

## Error Handling

The component includes:
- ✅ Network error handling with try-catch
- ✅ Toast notifications for errors
- ✅ Loading states during async operations
- ✅ Empty states when no data
- ✅ Wallet connection checks
- ✅ Graceful fallbacks

## Performance Considerations

### Caching
- Apollo Client caches GraphQL queries
- User positions cached until dependency changes
- No unnecessary re-renders (memoized callbacks)

### Optimization
- Lazy loading of pool data (first 50)
- Expandable details (not rendering all details by default)
- Modal only renders when open
- Debounced search (can be added if needed)

## Browser Compatibility
- Chrome/Edge: ✅ Full support
- Firefox: ✅ Full support
- Safari: ✅ Full support
- Mobile browsers: ✅ Responsive design

## Testing Checklist

### Manual Testing
- [ ] Wallet connection/disconnection
- [ ] Load "Your Positions" with/without positions
- [ ] Expand/collapse position cards
- [ ] Switch between tabs
- [ ] Search pools
- [ ] Open increase/remove modals
- [ ] Form validation in modal
- [ ] Response to network errors

### Edge Cases
- [ ] User with no positions
- [ ] Wallet not connected
- [ ] Network error fetching pools
- [ ] Network error fetching positions
- [ ] Pool with unusual fee tier
- [ ] Position with no uncollected fees
- [ ] Out of range position visual

## Troubleshooting

### Pools not loading
- Check Apollo Client is configured
- Verify GraphQL endpoint in ApolloClient config
- Check network tab for GraphQL errors

### Positions not loading
- Ensure signer is valid
- Check wallet is connected
- Verify usePositionManager hook works independently

### Modal not opening
- Check onClick handlers aren't blocked
- Verify Framer Motion is installed
- Check z-index doesn't conflict with other modals

### Styling issues
- Verify Tailwind CSS is configured
- Check custom component classes exist
- Inspect z-index values for modals

## File Structure

```
src/components/dex/
├── PositionsPanel.tsx              (main component)
└── PositionsPanel/
    └── LiquidityManageModal.tsx    (modal component)
```

## Dependencies

```json
{
  "@apollo/client": "^3.x",
  "wagmi": "^1.x",
  "ethers": "^6.x",
  "framer-motion": "^10.x",
  "sonner": "^1.x"
}
```

## Next Steps

1. **Implement Transaction Logic** in LiquidityManageModal
   - Handle increase liquidity call
   - Handle remove liquidity call
   - Add gas estimation
   - Handle transaction confirmation

2. **Add Collect Fees**
   - Implement collectFees contract call
   - Update UI after collection

3. **Enhance Pool Search**
   - Add debouncing
   - Add sorting options
   - Add TVL range filter

4. **Real-time Updates**
   - Add WebSocket subscriptions
   - Refresh positions periodically
   - Listen for contract events

5. **Advanced Features**
   - APY/APR calculations
   - Impermanent loss indicators
   - Position history
   - Fee charts
