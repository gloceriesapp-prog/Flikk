#!/usr/bin/env python3
"""Grant/revoke only this job's IPv4 /32; preserve browser SSH and web ports."""
import argparse
import ipaddress
import json
import os
import re
import subprocess
import time


def runner_cidr(value):
    network = ipaddress.ip_network(value, strict=True)
    if network.version != 4 or network.prefixlen != 32 or not network.network_address.is_global:
        raise ValueError('SSH access requires one public IPv4 /32')
    return str(network)


def aws(action, instance, port=None):
    command = ['aws', 'lightsail', action, '--instance-name', instance, '--output', 'json', '--no-cli-pager']
    if port is not None:
        command += ['--port-info', json.dumps(port)]
    return json.loads(subprocess.run(command, check=True, capture_output=True, text=True).stdout)


def ssh_access(states):
    cidrs, aliases, ipv6 = set(), set(), set()
    for rule in states.get('portStates', []):
        if rule.get('protocol') in ('tcp', 'all') and rule['fromPort'] <= 22 <= rule['toPort']:
            if rule.get('state') != 'open':
                continue
            cidrs.update(rule.get('cidrs', []))
            aliases.update(rule.get('cidrListAliases', []))
            ipv6.update(rule.get('ipv6Cidrs', []))
    return cidrs, aliases, ipv6


def change_access(action, instance, cidr, call=aws, pause=time.sleep):
    cidr = runner_cidr(cidr)
    if not re.fullmatch(r'[A-Za-z0-9][A-Za-z0-9_-]{0,253}', instance):
        raise ValueError('Invalid Lightsail instance name')
    before, aliases, ipv6 = ssh_access(call('get-instance-port-states', instance))
    if aliases != {'lightsail-connect'} or ipv6 or before - {cidr}:
        raise RuntimeError('Unexpected SSH rules: retain browser-only access and clear stale runner rules first')
    port = {'fromPort': 22, 'toPort': 22, 'protocol': 'tcp', 'cidrs': [cidr], 'ipv6Cidrs': [], 'cidrListAliases': []}
    call('open-instance-public-ports' if action == 'open' else 'close-instance-public-ports', instance, port)
    expected = {cidr} if action == 'open' else set()
    for attempt in range(10):
        actual, aliases, ipv6 = ssh_access(call('get-instance-port-states', instance))
        if actual == expected and aliases == {'lightsail-connect'} and not ipv6:
            print(f'SSH runner rule {action}: verified; browser SSH preserved')
            return
        if attempt < 9:
            pause(2)
    raise RuntimeError('SSH firewall did not reach the expected restricted state')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('action', choices=['open', 'close'])
    parser.add_argument('cidr')
    args = parser.parse_args()
    change_access(args.action, os.environ['LIGHTSAIL_INSTANCE_NAME'], args.cidr)
