import React, { useEffect, useState } from "react";
import {Card,Typography,List,Avatar,Tag,Row,Col,Empty,Spin,Space,message,Select} from "antd";

const { Title, Text } = Typography;
const { Option } = Select;

const API_BASE = process.env.NODE_ENV === "production" 
  ? ""
  : "http://127.0.0.1:8080";

const TIME_RANGES = [
    { label: "Last 4 Weeks", value: "short_term" },
    { label: "Last 6 Months", value: "medium_term" },
    { label: "All Time", value: "long_term" },
];

async function fetchBackend(path, { params } = {}) {
    const query = params
        ? "?" +
        new URLSearchParams(
            Object.fromEntries(
                Object.entries(params).filter(
                    ([, v]) => v !== undefined && v !== null
                )
            )
        )
        : "";

    const res = await fetch(`${API_BASE}${path}${query}`, {
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
    }
    return await res.json();
}

function useTop(type, timeRange) {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            setLoading(true);
            setError(null);
            try {
                const json = await fetchBackend(`/spotify/top/${type}`, {
                    params: { time_range: timeRange, limit: 10 },
                });
                const items = json.items || [];
                if (!cancelled) setData(items);
            } catch (e) {
                if (!cancelled) setError(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [type, timeRange]);

    return { data, loading, error };
}

function TopList({ items, type }) {
    if (!items?.length)
        return <Empty description={`No top ${type} found`} />;
    return (
        <List
            itemLayout="horizontal"
            dataSource={items}
            renderItem={(item, idx) => {
                if (type === "tracks") {
                    const primary = item?.name;
                    const secondary = (item?.artists || [])
                        .map((a) => a.name)
                        .join(", ");
                    const image = item?.album?.images?.[0]?.url;
                    return (
                        <List.Item>
                            <List.Item.Meta
                                avatar={
                                    <Avatar shape="square" src={image} alt={primary} />
                                }
                                title={
                                    <Space>
                                        <Tag>{idx + 1}</Tag>
                                        <Typography.Link
                                            href={item?.external_urls?.spotify}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {primary}
                                        </Typography.Link>
                                    </Space>
                                }
                                description={
                                    <Text type="secondary">
                                        {secondary} — {item?.album?.name}
                                    </Text>
                                }
                            />
                        </List.Item>
                    );
                } else {
                    const primary = item?.name;
                    const image = item?.images?.[0]?.url;
                    return (
                        <List.Item>
                            <List.Item.Meta
                                avatar={
                                    <Avatar shape="circle" src={image} alt={primary} />
                                }
                                title={
                                    <Space>
                                        <Tag>{idx + 1}</Tag>
                                        <Typography.Link
                                            href={item?.external_urls?.spotify}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            {primary}
                                        </Typography.Link>
                                    </Space>
                                }
                                description={(item?.genres || [])
                                    .slice(0, 4)
                                    .join(", ")}
                            />
                        </List.Item>
                    );
                }
            }}
        />
    );
}

const SectionCard = ({ title, children }) => (
    <Card
        className="rounded-2xl shadow-sm"
        title={<Title level={4} style={{ margin: 0 }}>{title}</Title>}
    >
        {children}
    </Card>
);

export default function SpotifyTrendsPage() {
    const [timeRange, setTimeRange] = useState("short_term");

    const {
        data: topTracks,
        loading: ttLoading,
        error: ttError,
    } = useTop("tracks", timeRange);
    const {
        data: topArtists,
        loading: taLoading,
        error: taError,
    } = useTop("artists", timeRange);

    useEffect(() => {
        if (ttError || taError) {
            message.warning(ttError || taError);
        }
    }, [ttError, taError]);

    const headerExtra = (
        <Space wrap>
            <Select
                value={timeRange}
                onChange={setTimeRange}
                style={{ width: 170 }}
            >
                {TIME_RANGES.map((tr) => (
                    <Option key={tr.value} value={tr.value}>
                        {tr.label}
                    </Option>
                ))}
            </Select>
        </Space>
    );

    return (
        <div className="p-6">
            <Card
                className="mb-4 rounded-2xl shadow-sm"
                title={
                    <Title level={3} style={{ margin: 0 }}>
                        Your Top 10
                    </Title>
                }
                extra={headerExtra}
            >
                <Text type="secondary">
                    View your top 10 tracks and top 10 artists.
                </Text>
            </Card>

            <Row gutter={[16, 16]}>
                <Col xs={24} lg={12}>
                    <SectionCard title="Top Tracks">
                        {ttLoading ? (
                            <Spin />
                        ) : (
                            <TopList items={topTracks} type="tracks" />
                        )}
                    </SectionCard>
                </Col>
                <Col xs={24} lg={12}>
                    <SectionCard title="Top Artists">
                        {taLoading ? (
                            <Spin />
                        ) : (
                            <TopList items={topArtists} type="artists" />
                        )}
                    </SectionCard>
                </Col>
            </Row>
        </div>
    );
}
