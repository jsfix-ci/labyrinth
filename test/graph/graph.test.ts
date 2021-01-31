import {assert} from 'chai';
import 'mocha';

import {Universe} from '../../src/dimensions';
import {ForwardRuleSpecEx, Graph, GraphBuilder, NodeSpec} from '../../src/graph';
import {createSimplifier} from '../../src/setops';
import {firewallSpec} from '../../src/specs';

const universe = new Universe(firewallSpec);
const simplifier = createSimplifier<ForwardRuleSpecEx>(universe);

function paths(graph: Graph, from: string, to: string, outbound: boolean) {
  const {flows} = graph.analyze(from, outbound);
  const filtered = flows.filter(flow => flow.node.key === to);
  return filtered.map(
    flow => graph.formatFlow(flow, outbound, true)
  ).join('\n');
}

function trim(text: string) {
  const lines = text.split(/\n/);
  if (lines.length < 2) {
    return text;
  } else {
    if (lines[0].trim() === '') {
      lines.shift();  // Remove leading blank line
    }

    if (lines[lines.length - 1].trim() === '') {
      lines.pop();    // Remove trailing blank line
    }

    const indent = lines[0].length - lines[0].trimStart().length;
    const trimmed = lines.map(line => {
      if (line.length < indent) {
        return line.trimStart();
      } else {
        return line.slice(indent);
      }
    });
    return trimmed.join('\n');
  }
}

describe('Graph', () => {
  describe('errors', () => {
    it('unknown destination', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          rules: [
            {
              destination: 'bad_key',
            },
          ],
        },
      ];
      const builder = new GraphBuilder(universe, simplifier, nodes);
      assert.throws(
        () => {
          builder.buildGraph();
        },
        'Unknown node "bad_key".'
      );
    });

    it('duplicate node key', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          rules: [
            {
              destination: 'bad_key',
            },
          ],
        },
        {
          name: 'internet',
          key: 'internet',
          rules: [
            {
              destination: 'bad_key',
            },
          ],
        },
      ];
      assert.throws(
        () => {
          new GraphBuilder(universe, simplifier, nodes);
        },
        'Duplicate node key "internet".'
      );
    });

    it('unknown start point', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'internet',
          rules: [
            {
              destination: 'gateway',
            },
          ],
        },
        {
          key: 'gateway',
          rules: [],
        },
      ];

      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();

      assert.throws(
        () => {
          graph.analyze('bad_key', true);
        },
        'Unknown node "bad_key".'
      );
    });
  });

  describe('cycles', () => {
    it('simple cycle', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          rules: [
            {
              destination: 'a',
            },
          ],
        },
        {
          name: 'a',
          key: 'a',
          rules: [
            {
              destination: 'b',
            },
          ],
        },
        {
          name: 'b',
          key: 'b',
          rules: [
            {
              destination: 'c',
            },
          ],
        },
        {
          name: 'c',
          key: 'c',
          rules: [
            {
              destination: 'a',
            },
          ],
        },
      ];
      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const {cycles} = graph.analyze('internet', true);
      assert.equal(cycles.length, 1);
      const c = graph.formatCycle(cycles[0]);
      assert.equal(c, 'a => b => c => a');
    });

    it('double cycle variant one', () => {
      const nodes: NodeSpec[] = [
        // Main line
        {
          key: 'main1',
          rules: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'main2',
          rules: [
            {
              destination: 'main3',
            },
          ],
        },
        {
          key: 'main3',
          rules: [
            {
              destination: 'left1',
              destinationPort: '1'
            },
            {
              destination: 'right1',
              destinationPort: '2'
            },
            {
              destination: 'main4',
            },
          ],
        },
        {
          key: 'main4',
          rules: [],
        },

        // Left loop
        {
          key: 'left1',
          rules: [
            {
              destination: 'left2',
            },
          ],
        },
        {
          key: 'left2',
          rules: [
            {
              destination: 'main2',
            },
          ],
        },

        // Right loop
        {
          key: 'right1',
          rules: [
            {
              destination: 'right2',
            },
          ],
        },
        {
          key: 'right2',
          rules: [
            {
              destination: 'main2',
            },
          ],
        },
      ];

      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const {cycles} = graph.analyze('main1', true);
      assert.equal(cycles.length, 2);
      const c0 = graph.formatCycle(cycles[0], true);
      assert.equal(c0, 'main2 => main3 => left1 => left2 => main2\n  destination port: 1');

      const c1 = graph.formatCycle(cycles[1], true);
      assert.equal(c1, 'main2 => main3 => right1 => right2 => main2\n  destination port: 2');
      console.log(c1);
    });

    it('double cycle variant two', () => {
      const nodes: NodeSpec[] = [
        // Main line
        {
          key: 'main1',
          rules: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'main2',
          rules: [
            {
              destination: 'right1',
              destinationPort: '2'
            },
            {
              destination: 'main3',
            },
          ],
        },
        {
          key: 'main3',
          rules: [
            {
              destination: 'left1',
              destinationPort: '1'
            },
            {
              destination: 'main2',
              destinationPort: '2'  // Intended test case
            },
            {
              destination: 'main4',
            },
          ],
        },
        {
          key: 'main4',
          rules: [],
        },

        // Left loop
        {
          key: 'left1',
          rules: [
            {
              destination: 'left2',
            },
          ],
        },
        {
          key: 'left2',
          rules: [
            {
              destination: 'main2',
            },
          ],
        },

        // Right loop
        {
          key: 'right1',
          rules: [
            {
              destination: 'right2',
            },
          ],
        },
        {
          key: 'right2',
          rules: [
            {
              destination: 'main3',
            },
          ],
        },
      ];

      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const {cycles} = graph.analyze('main1', true);
      // for (const c of cycles) {
      //   console.log(graph.formatCycle(c, true));
      // }

      assert.equal(cycles.length, 2);
      const c0 = graph.formatCycle(cycles[0], true);
      const c1 = graph.formatCycle(cycles[1], true);

      assert.equal(c0, 'main2 => right1 => right2 => main3 => main2\n  destination port: 2');
      assert.equal(c1, 'main2 => main3 => left1 => left2 => main2\n  destination port: 1');
    });

    // Loopback to endpoint is not a cycle
    it('loopback to endpoint is not a cycle', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          endpoint: true,
          rules: [
            {
              destination: 'a',
            },
          ],
        },
        {
          name: 'a',
          key: 'a',
          rules: [
            {
              destination: 'b',
            },
          ],
        },
        {
          name: 'b',
          key: 'b',
          rules: [
            {
              destination: 'c',
            },
          ],
        },
        {
          name: 'c',
          key: 'c',
          rules: [
            {
              destination: 'internet',
            },
          ],
        },
      ];
      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const {cycles} = graph.analyze('internet', true);
      assert.equal(cycles.length, 0);
    });
  });

  // Forward propagate
  describe('forward propagate', () => {
    it('linear unidirectional', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'a',
          endpoint: true,
          rules: [
            {
              destination: 'b',
              sourcePort: '1',
            },
          ],
        },
        {
          key: 'b',
          rules: [
            {
              destination: 'c',
              destinationPort: '2'
            },
          ],
        },
        {
          key: 'c',
          rules: [
            {
              destination: 'd',
              protocol: 'tcp'
            },
          ],
        },
        {
          key: 'd',
          endpoint: true,
          rules: [],
        },
      ];

      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'a', 'd', outbound),
        trim(`
          d:
            paths:
              a => b => c => d
                source port: 1
                destination port: 2
                protocol: tcp

            routes:
              source port: 1
              destination port: 2
              protocol: tcp
        `)
      );

      assert.equal(
        paths(graph, 'd', 'a', outbound),
        trim(`
          a:
            paths:
              (no paths)

            routes:
              (no routes)
        `)
      );
    });

    it('linear bidirectional', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'a',
          endpoint: true,
          rules: [
            {
              destination: 'b',
              destinationIp: '10.0.0.0/8',
              sourcePort: '1',
            },
          ],
        },
        {
          key: 'b',
          rules: [
            {
              destination: 'c',
              destinationIp: '10.0.0.0/8',
              destinationPort: '2'
            },
            {
              destination: 'a',
            },
          ],
        },
        {
          key: 'c',
          rules: [
            {
              destination: 'd',
              destinationIp: '10.0.0.0/8',
              protocol: 'tcp'
            },
            {
              destination: 'b',
            },
          ],
        },
        {
          key: 'd',
          endpoint: true,
          rules: [
            {
              destination: 'c',
              destinationIp: 'except 10.0.0.0/8',
            },
          ],
        },
      ];

      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'a', 'd', outbound),
        trim(`
          d:
            paths:
              a => b => c => d
                source port: 1
                destination ip: 10.0.0.0/8
                destination port: 2
                protocol: tcp
          
            routes:
              source port: 1
              destination ip: 10.0.0.0/8
              destination port: 2
              protocol: tcp
        `)
      );

      assert.equal(
        paths(graph, 'd', 'a', outbound),
        trim(`
          a:
            paths:
              d => c => b => a
                destination ip: except 10.0.0.0/8
          
            routes:
              destination ip: except 10.0.0.0/8
        `)
      );
    });

    it('confluence', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'main1',
          endpoint: true,
          rules: [
            {
              destination: 'left',
              destinationIp: '10.0.0.0/8',
            },
            {
              destination: 'right',
              destinationIp: '11.0.0.0/8',
            },
          ],
        },
        {
          key: 'left',
          rules: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'right',
          rules: [
            {
              destination: 'main2',
            },
          ],
        },
        {
          key: 'main2',
          endpoint: true,
          rules: [],
        },
      ];

      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'main1', 'main2', outbound),
        trim(`
          main2:
            paths:
              main1 => left => main2
                destination ip: 10.0.0.0/8
              main1 => right => main2
                destination ip: 11.0.0.0/8
          
            routes:
              destination ip: 10.0.0.0/7
        `)
      );
    });

    it('upstream shadows downstream', () => {
      const nodes: NodeSpec[] = [
        {
          key: 'main',
          endpoint: true,
          rules: [
            {
              destination: 'a',
              destinationIp: '10.0.0.0/8',
            },
            {
              destination: 'b',
              destinationIp: '10.0.0.0/8',
            },
            {
              destination: 'c',
              destinationIp: '10.0.0.0/7',
            },
          ],
        },
        {
          key: 'a',
          endpoint: true,
          rules: [],
        },
        {
          key: 'b',
          endpoint: true,
          rules: [],
        },
        {
          key: 'c',
          endpoint: true,
          rules: [],
        },
      ];

      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const outbound = true;

      assert.equal(
        paths(graph, 'main', 'a', outbound),
        trim(`
          a:
            paths:
              main => a
                destination ip: 10.0.0.0/8

            routes:
              destination ip: 10.0.0.0/8
        `)
      );

      assert.equal(
        paths(graph, 'main', 'b', outbound),
        trim(`
          b:
            paths:
              (no paths)

            routes:
              (no routes)
        `)
      );

      assert.equal(
        paths(graph, 'main', 'c', outbound),
        trim(`
          c:
            paths:
              main => c
                destination ip: 11.0.0.0/8

            routes:
              destination ip: 11.0.0.0/8
        `)
      );

    });


    it('complex', () => {
      const nodes: NodeSpec[] = [
        {
          name: 'internet',
          key: 'internet',
          endpoint: true,
          rules: [
            {
              destination: 'gateway',
            },
          ],
        },
        {
          name: 'gateway',
          key: 'gateway',
          rules: [
            {
              destination: 'subnet1',
              destinationIp: '10.0.0.0/8',
            },
            {
              destination: 'subnet2',
              destinationIp: '10.0.0.0/7',
            },
          ],
        },
        {
          name: 'subnet1',
          key: 'subnet1',
          rules: [
            {
              destination: 'subnet2',
              destinationPort: '80',
            },
            {
              destination: 'subnet3',
            },
          ],
        },
        {
          name: 'subnet2',
          key: 'subnet2',
          rules: [
            {
              destination: 'server',
              protocol: 'tcp',
            },
          ],
        },
        {
          name: 'subnet3',
          key: 'subnet3',
          rules: [],
        },
        {
          name: 'server',
          key: 'server',
          endpoint: true,
          rules: [],
        },
      ];

      const builder = new GraphBuilder(universe, simplifier, nodes);
      const graph = builder.buildGraph();
      const outbound = true;
      const {cycles, flows} = graph.analyze('internet', outbound);

      assert.equal(cycles.length, 0);

      const observed= flows.map(
        flow => graph.formatFlow(flow, outbound)
      ).join('\n');

      const expected = trim(`
        internet:
          paths:
            (no paths)
        
          routes:
            (no routes)
        gateway:
          paths:
            internet => gateway
        
          routes:
            (universe)
        subnet1:
          paths:
            internet => gateway => subnet1
        
          routes:
            destination ip: 10.0.0.0/8
        subnet2:
          paths:
            internet => gateway => subnet1 => subnet2
            internet => gateway => subnet2
        
          routes:
            destination ip: 10.0.0.0/8
            destination port: 80
        
            destination ip: 11.0.0.0/8
        subnet3:
          paths:
            internet => gateway => subnet1 => subnet3
        
          routes:
            destination ip: 10.0.0.0/8
            destination port: except 80
        server:
          paths:
            internet => gateway => subnet1 => subnet2 => server
            internet => gateway => subnet2 => server
        
          routes:
            destination ip: 10.0.0.0/8
            destination port: 80
            protocol: tcp
        
            destination ip: 11.0.0.0/8
            protocol: tcp
      `);

      assert.equal(observed, expected);
    });
  });

  // Backward propagation
  // server => subnet => server | internet
  // Builder - add, remove, update
});
