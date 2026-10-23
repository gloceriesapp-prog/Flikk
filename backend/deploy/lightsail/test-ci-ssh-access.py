import importlib.util
import pathlib
import unittest

spec = importlib.util.spec_from_file_location('access', pathlib.Path(__file__).with_name('ci-ssh-access.py'))
access = importlib.util.module_from_spec(spec)
spec.loader.exec_module(access)


class Firewall:
    def __init__(self):
        self.cidrs = set()
        self.calls = []
        self.stuck = False

    def __call__(self, action, instance, port=None):
        self.calls.append((action, instance, port))
        if port:
            assert port['fromPort'] == port['toPort'] == 22
            assert port['protocol'] == 'tcp'
            assert port['cidrListAliases'] == port['ipv6Cidrs'] == []
            if not self.stuck:
                if action.startswith('open'):
                    self.cidrs.update(port['cidrs'])
                else:
                    self.cidrs.difference_update(port['cidrs'])
        return {'portStates': [
            {'fromPort': 22, 'toPort': 22, 'protocol': 'tcp', 'state': 'open', 'cidrs': list(self.cidrs), 'cidrListAliases': ['lightsail-connect']},
            {'fromPort': 80, 'toPort': 80, 'protocol': 'tcp', 'state': 'open', 'cidrs': ['0.0.0.0/0']},
            {'fromPort': 443, 'toPort': 443, 'protocol': 'tcp', 'state': 'open', 'cidrs': ['0.0.0.0/0']},
        ]}


class AccessTests(unittest.TestCase):
    def test_open_then_cleanup(self):
        firewall = Firewall()
        for action in ['open', 'close', 'close']:
            access.change_access(action, 'gloceries-api', '8.8.8.8/32', firewall, lambda _: None)
        self.assertEqual(firewall.cidrs, set())

    def test_reject_broad_private_and_ipv6_before_any_aws_call(self):
        for cidr in ['0.0.0.0/0', '8.8.8.0/24', '127.0.0.1/32', '10.0.0.1/32', '::/0', 'bad']:
            firewall = Firewall()
            with self.assertRaises(ValueError):
                access.change_access('open', 'gloceries-api', cidr, firewall)
            self.assertEqual(firewall.calls, [])

    def test_refuse_existing_stale_rule(self):
        firewall = Firewall()
        firewall.cidrs.add('1.1.1.1/32')
        with self.assertRaises(RuntimeError):
            access.change_access('open', 'gloceries-api', '8.8.8.8/32', firewall)
        self.assertTrue(all(call[2] is None for call in firewall.calls))

    def test_cleanup_failure_is_a_failure(self):
        firewall = Firewall()
        firewall.cidrs.add('8.8.8.8/32')
        firewall.stuck = True
        with self.assertRaises(RuntimeError):
            access.change_access('close', 'gloceries-api', '8.8.8.8/32', firewall, lambda _: None)

    def test_never_change_anything_without_browser_ssh(self):
        calls = []
        def missing_browser(action, instance, port=None):
            calls.append(action)
            return {'portStates': []}
        with self.assertRaises(RuntimeError):
            access.change_access('open', 'gloceries-api', '8.8.8.8/32', missing_browser)
        self.assertEqual(calls, ['get-instance-port-states'])


if __name__ == '__main__':
    unittest.main()
