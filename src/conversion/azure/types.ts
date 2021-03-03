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

// TODO: better names for AzureIdReference and AzureObjectBase.
export interface AzureObjectBase {
  id: string;
  resourceGroup: string;
}

export interface AzureTypedObject extends AzureObjectBase {
  name: string;
  type: string;
}

// DESIGN NOTE: the unused type parameter T is for the benefit of
// a generic function that dereferences an AzureReference<T> into
// a T.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type AzureReference<T> = AzureObjectBase;

export interface AzureLocalIP extends AzureTypedObject {
  type: 'Microsoft.Network/networkInterfaces/ipConfigurations';
  properties: {
    privateIPAddress: string;
    subnet: AzureObjectBase | undefined;
  };
}

export interface AzurePublicIp extends AzureTypedObject {
  type: 'microsoft.network/publicipaddresses';
  properties: {
    ipAddress: string;
    subnet: AzureObjectBase | undefined;
  };
}

export type AzureIPConfiguration = AzureLocalIP | AzurePublicIp;

export interface AzureNetworkInterface extends AzureTypedObject {
  type: 'microsoft.network/networkinterfaces';
  properties: {
    ipConfigurations: AzureIPConfiguration[];
  };
}

export interface AzureNetworkSecurityGroup extends AzureTypedObject {
  type: 'microsoft.network/networksecuritygroups';
  properties: {
    defaultSecurityRules: AzureSecurityRule[];
    securityRules: AzureSecurityRule[];
    subnets: AzureReference<AzureSubnet>[];
  };
}

export interface AzureSecurityRule extends AzureTypedObject {
  type:
    | 'Microsoft.Network/networkSecurityGroups/defaultSecurityRules'
    | 'Microsoft.Network/networkSecurityGroups/securityRules';
  properties: {
    access: 'Allow' | 'Deny';
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
  };
}

export interface AzureSubnet extends AzureTypedObject {
  type: 'Microsoft.Network/virtualNetworks/subnets';
  properties: {
    addressPrefix: string;
    ipConfigurations: AzureReference<AzureIPConfiguration>[];
    networkSecurityGroup: AzureReference<AzureNetworkSecurityGroup>;
    // TODO: privateEndpoints
  };
}

export interface AzureVirtualNetwork extends AzureTypedObject {
  type: 'microsoft.network/virtualnetworks';
  properties: {
    addressSpace: {
      addressPrefixes: string[];
    };
    subnets: AzureSubnet[];
    // TODO: virtualNetworkPeerings
  };
}

export type AnyAzureObject =
  | AzureIPConfiguration
  | AzureNetworkInterface
  | AzureNetworkSecurityGroup
  | AzureSecurityRule
  | AzureSubnet
  | AzureVirtualNetwork;
