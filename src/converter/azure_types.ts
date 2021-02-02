///////////////////////////////////////////////////////////////////////////////
//
// Type system skeleton for Azure resource graph.
//
// The resource graph is an AzureObjectBase[].
//
//
// Here's one way to get the resource graph for the resource group 
// called "labyringth-sample"
//
// # Install the CLI extension
// az extension add --name resource-graph
//
// # Run a query to get everything (note: this is Kusto syntax)
// az graph query -q 'resources | where resourceGroup == "labyrinth-sample"'
//
///////////////////////////////////////////////////////////////////////////////
export interface AzureObjectBase {
  id: string;
  name: string;
  resourceGroup: string;
  type: string;
};

export interface AzureReference<T> {
  id: string;
  resourceGroup: string;
}

export interface AzureIPConfiguration extends AzureObjectBase {
  type: 'Microsoft.Network/networkInterfaces/ipConfigurations';
  properties: {
    privateIPAddress: string;
    // TODO: publicIPAddresses, subnet
  }
}

export interface AzureNetworkInterface extends AzureObjectBase {
  type: 'microsoft.network/networkinterfaces';
  properties: {
    ipConfigurations: AzureIPConfiguration[];
  }
}

export function asAzureNetworkInterface(
  item: AnyAzureObject
): AzureNetworkInterface | null {
  return item.type === 'microsoft.network/networkinterfaces' ? item: null;
}

export interface AzureNetworkSecurityGroup extends AzureObjectBase {
  type: 'microsoft.network/networksecuritygroups';
  properties: {
    defaultSecurityRules: AzureSecurityRule[];
    securityRules: AzureSecurityRule[];
    subnets: AzureReference<AzureSubnet>[];
  }
}

export interface AzureSecurityRule extends AzureObjectBase {
  type: (
    'Microsoft.Network/networkSecurityGroups/defaultSecurityRules' |
    'Microsoft.Network/networkSecurityGroups/securityRules'
  );
  properties: {
    access: "Allow" | "Deny";
    destinationAddressPrefix: string;
    destinationAddressPrefixes: string[];
    destinationPortRange: string;
    destinationPortRanges: string[];
    direction: 'Inbound' | 'Outbound';
    priority: number;
    protocol: string;
    sourceAddressPrefix: string;
    sourceAddressPrefixes: string[];
    sourcePortRange: string;
    sourcePortRanges: string[];
  }
}

export interface AzureSubnet extends AzureObjectBase {
  type: 'Microsoft.Network/virtualNetworks/subnets';
  properties: {
    addressPrefix: string;
    ipConfigurations: AzureReference<AzureIPConfiguration>[];
    networkSecurityGroup: AzureReference<AzureNetworkSecurityGroup>;
    // TODO: privateEndpoints
  };
}

export interface AzureVirtualNetwork extends AzureObjectBase {
  type: 'microsoft.network/virtualnetworks';
  properties: {
    addressSpace: {
      addressPrefixes: string[];
    };
    subnets: AzureSubnet[];
    // TODO: virtualNetworkPeerings
  };
}

export function asAzureVirtualNetwork(
  item: AnyAzureObject
): AzureVirtualNetwork | null {
  return item.type === 'microsoft.network/virtualnetworks' ? item: null;
}

export type AnyAzureObject = (
  AzureIPConfiguration |
  AzureNetworkInterface |
  AzureNetworkSecurityGroup |
  AzureSecurityRule |
  AzureSubnet |
  AzureVirtualNetwork
);
